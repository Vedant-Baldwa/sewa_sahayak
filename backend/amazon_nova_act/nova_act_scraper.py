import os
import json
import urllib3
from pydantic import BaseModel, Field
from typing import List, Optional

# Suppress InsecureRequestWarning for cleaner hackathon logs
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

try:
    from nova_act import NovaAct, workflow
    # The workflow labels provided by the user are in us-east-1
    os.environ["AWS_DEFAULT_REGION"] = "us-east-1"
    os.environ["AWS_REGION"] = "us-east-1"
    from aws_services.check_portal_health import check_portal_health
except ImportError:
    print("Nova Act SDK or required module is not installed.")
    exit(1)


# ---------------------------------------------------------------------------
# Pydantic Schema — shared across ALL portals
# ---------------------------------------------------------------------------
class ComplaintFormField(BaseModel):
    field_name: str = Field(description="The visible label or name of the field on the portal")
    field_type: str = Field(description="The type: 'text_input', 'dropdown', 'date_picker', 'textarea', 'captcha', 'radio', 'checkbox', 'file_upload'")
    is_mandatory: bool = Field(description="Whether visually it is marked as mandatory (like with a * asterisk)")
    options: Optional[List[str]] = Field(description="List of options if this field is a dropdown, empty otherwise", default=None)


class ComplaintFormSchema(BaseModel):
    portal_url: str = Field(description="The URL of the portal that was scraped")
    portal_name: str = Field(description="Human-readable name of the portal")
    fields: List[ComplaintFormField]


# ---------------------------------------------------------------------------
# Generic portal scraper — works with ANY URL from portals.json
# ---------------------------------------------------------------------------
@workflow(workflow_definition_name="sewa-sahayak-portal-scraper", model_id="nova-act-latest")
def extract_form_fields(portal_url: str, portal_name: str = "Unknown Portal") -> dict:
    """
    Navigate to a government portal URL and extract its complaint/grievance
    form fields into a structured Pydantic schema using Amazon Nova Act.

    This is the universal scraper called by the /api/route flow after the
    Cognitive Dispatcher selects the correct portal.

    Args:
        portal_url:  The URL returned by route_complaint (e.g. from portals.json)
        portal_name: The key name of the portal (e.g. "NHAI", "MUMBAI_BMC")

    Returns:
        A dict with portal_url, portal_name, and a list of extracted fields.
    """
    print(f"\n[Nova Act] Scraping portal: {portal_name}")
    print(f"[Nova Act] URL: {portal_url}")

    # --- Pre-flight Check ---
    health_error = check_portal_health(portal_url)
    if health_error:
        print(f"[Nova Act] Aborting scrape: {health_error}")
        return {
            "portal_url": portal_url,
            "portal_name": portal_name,
            "fields": [],
            "error": health_error
        }

    try:
        with NovaAct(
            starting_page=portal_url,
            headless=False,
            ignore_https_errors=True,  # Critical for legacy government portals
        ) as nova:

            print("[Nova Act] Page loaded. Analyzing UI elements...")

            # --- Step 1: Atomic Extraction ---
            # Let the agent reason about the page structure before strict extraction
            nova.act(
                "Identify the main complaint or grievance registration form on this page. "
                "If there are multiple sections or tabs, focus on the primary registration form."
            )

            # --- Step 2: Structured Schema Mapping ---
            print("[Nova Act] Extracting fields into Pydantic schema...")
            prompt = (
                "Extract all visible input fields from the complaint/grievance registration form. "
                "Include field labels, whether they are required/mandatory, their input type "
                "(text, dropdown, date picker, file upload, captcha, etc.), and any dropdown options visible."
            )

            result = nova.act_get(prompt, schema=ComplaintFormSchema.model_json_schema())

            if result.parsed_response:
                parsed_data = ComplaintFormSchema.model_validate(result.parsed_response)
                # Ensure the portal metadata is correct (model may hallucinate these)
                parsed_data.portal_url = portal_url
                parsed_data.portal_name = portal_name
                output = parsed_data.model_dump()
                print(f"[Nova Act] Successfully extracted {len(parsed_data.fields)} fields from {portal_name}.")
                return output
            else:
                print(f"[Nova Act] Failed to parse response for {portal_name}. Raw: {result.response}")
                return {
                    "portal_url": portal_url,
                    "portal_name": portal_name,
                    "fields": [],
                    "error": "Failed to parse structured response from Nova Act."
                }

    except Exception as e:
        error_msg = str(e)
        print(f"[Nova Act] Error scraping {portal_name}: {error_msg}")
        return {
            "portal_url": portal_url,
            "portal_name": portal_name,
            "fields": [],
            "error": error_msg
        }


# ---------------------------------------------------------------------------
# Bulk scraper — iterates over ALL portals in portals.json
# ---------------------------------------------------------------------------
def scrape_all_portals(portals_json_path: Optional[str] = None) -> List[dict]:
    """
    Load portals.json and scrape every portal URL.
    Returns a list of ComplaintFormSchema dicts.
    """
    if portals_json_path is None:
        portals_json_path = os.path.join(os.path.dirname(__file__), "..", "portals.json")

    with open(portals_json_path, "r") as f:
        portals_db = json.load(f)

    results = []
    for category, portals in portals_db.items():
        for portal_name, portal_url in portals.items():
            print(f"\n{'='*60}")
            print(f"Category: {category} | Portal: {portal_name}")
            print(f"{'='*60}")
            result = extract_form_fields(portal_url=portal_url, portal_name=portal_name)
            results.append(result)

    return results


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import sys

    if len(sys.argv) >= 2:
        # Single portal mode: python nova_act_scraper.py <url> [name]
        url = sys.argv[1]
        name = sys.argv[2] if len(sys.argv) >= 3 else "CLI_Portal"
        result = extract_form_fields(portal_url=url, portal_name=name)
        print("\n----- EXTRACTION RESULT -----")
        print(json.dumps(result, indent=2))
    else:
        # Bulk mode: scrape everything in portals.json
        print("No URL provided. Scraping ALL portals from portals.json ...")
        all_results = scrape_all_portals()
        print(f"\n\n{'='*60}")
        print(f"SCRAPING COMPLETE — {len(all_results)} portals processed.")
        print(f"{'='*60}")
        # Save results to a file
        output_path = os.path.join(os.path.dirname(__file__), "..", "scraped_portals.json")
        with open(output_path, "w") as f:
            json.dump(all_results, f, indent=2)
        print(f"Results saved to {output_path}")
