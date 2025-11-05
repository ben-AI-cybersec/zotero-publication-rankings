import csv
import json

def extract_sjr_rankings(csv_file_path, output_file='sjr_rankings.json'):
    """
    Extract SJR rankings and quartiles from the scimagojr CSV file and create a dictionary.
    
    Args:
        csv_file_path: Path to the scimagojr CSV file
        output_file: Path to save the JSON output (optional)
    
    Returns:
        Dictionary with journal titles (lowercase) as keys and dict with SJR + quartile as values
    """
    sjr_dict = {}
    
    with open(csv_file_path, 'r', encoding='utf-8') as file:
        # CSV uses semicolon as delimiter
        reader = csv.DictReader(file, delimiter=';')
        
        for row in reader:
            title = row['Title'].strip().lower()
            sjr_value = row['SJR'].strip()
            quartile = row['SJR Best Quartile'].strip()
            
            # Convert SJR value from string to float, handling comma as decimal separator
            try:
                sjr_float = float(sjr_value.replace(',', '.'))
                # Store both SJR and quartile
                sjr_dict[title] = {
                    'sjr': sjr_float,
                    'quartile': quartile if quartile else '-'
                }
            except ValueError:
                print(f"Warning: Could not convert SJR value '{sjr_value}' for journal '{title}'")
                continue
    
    # Save to JSON file if output_file is specified
    if output_file:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(sjr_dict, f, indent=2, ensure_ascii=False)
        print(f"SJR rankings saved to {output_file}")
    
    return sjr_dict

def generate_javascript_dict(sjr_dict, output_file='sjr_rankings.js'):
    """
    Generate a JavaScript file with the SJR rankings and quartiles dictionary.
    
    Args:
        sjr_dict: Dictionary with journal titles and SJR data (sjr + quartile)
        output_file: Path to save the JavaScript file
    """
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('var sjr_rankings = {\n')
        
        for i, (title, data) in enumerate(sorted(sjr_dict.items())):
            # Add comma for all lines except the last one
            comma = ',' if i < len(sjr_dict) - 1 else ''
            f.write(f'    "{title}": {{sjr: {data["sjr"]}, quartile: "{data["quartile"]}"}}{comma}\n')
        
        f.write('};\n')
    
    print(f"JavaScript dictionary saved to {output_file}")

if __name__ == "__main__":
    csv_file = "scimagojr 2024.csv"
    
    print("Extracting SJR rankings from CSV...")
    sjr_dict = extract_sjr_rankings(csv_file)
    
    print(f"Found {len(sjr_dict)} journals with SJR rankings")
    
    # Generate JavaScript file
    generate_javascript_dict(sjr_dict)
    
    # Print some sample entries
    print("\nSample entries:")
    for i, (title, data) in enumerate(list(sjr_dict.items())[:5]):
        print(f"  {title}: SJR={data['sjr']}, Quartile={data['quartile']}")
