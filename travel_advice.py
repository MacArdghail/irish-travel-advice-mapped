from playwright.sync_api import sync_playwright
import re
import json
import sys

def get_countries(page):
    page.goto(f"https://www.ireland.ie/en/dfa/overseas-travel/advice/", timeout=30000)
    page.wait_for_load_state("domcontentloaded")
    
    # Get all links that point to country advice pages
    all_links = page.eval_on_selector_all(
        "a[href*='/advice/']",
        "els => els.map(e => ({ text: e.innerText.trim(), href: e.getAttribute('href') }))"
    )
    
    country_status = {}
    seen = set()
    
    for link in all_links:
        href = link.get('href', '')
        text = link.get('text', '')
        
        if href and text and re.search(r'/en/dfa/overseas-travel/advice/[a-z-]+/?$', href):
            # Extract country/territory slug from URL
            slug_match = re.search(r'/advice/([a-z-]+)/?$', href)
            if not slug_match:
                continue
            
            country_slug = slug_match.group(1)
            
            if country_slug not in seen:
                seen.add(country_slug)
                 
                page.goto("https://www.ireland.ie" + href, timeout=30000)
                page.wait_for_load_state("domcontentloaded")

                # Get advisory level
                try:
                    page.wait_for_selector(".accordion_travel", timeout=5000)
                    class_attr = page.locator(".accordion_travel").first.get_attribute("class")
                    level = "unknown"
                    m = re.search(r"accordion_travel\s+([a-z-]+)", class_attr)
                    if m:
                        level = m.group(1)
                    
                    country_status[country_slug] = level
                    print(f"  {country_slug}: {level}", file=sys.stderr)
                except Exception as e:
                    print(f"  Error getting status for {country_slug}: {e}", file=sys.stderr)
    
    return country_status

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=['--disable-blink-features=AutomationControlled']
        )
        
        context = browser.new_context(
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport={'width': 1920, 'height': 1080}
        )
        
        page = context.new_page()
        page.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
        """)
        
        country_status = get_countries(page)
        
        if not country_status:
            print("ERROR: No countries found!", file=sys.stderr)
            browser.close()
            sys.exit(1)
        
        # Output as JSON in the format: {"country-slug": "status-level"}
        print(json.dumps(country_status, indent=2, ensure_ascii=False))
        
        browser.close()

if __name__ == "__main__":
    main()
