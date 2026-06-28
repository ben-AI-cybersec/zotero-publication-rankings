import csv
import json
import os
import sys

def extract_VHB_rankings(csv_file_path, output_file='vhb_rankings.json'):
    """
    Extracts VHB rankings from a CSV file and creates a dictionary.
    
    Args:
        csv_file_path: Path to the CSV file
        output_file: Path to save the JSON output (optional)
    
    Returns:
        Dictionary with journal titles (lowercase) as keys and dict with ABS Ranking
    """
    vhb_dic = {}
    
    with open(csv_file_path, 'r', encoding='utf-8') as file:
        # CSV here uses , as delimiter
        reader = csv.reader(file, delimiter=',')
        
        for row in reader:
            vhb_dic[row[0].strip().lower()] = {"vhb": row[2].strip()}
 
    print(f"{len(vhb_dic)} journal added\n")

    # Save to JSON file
    if output_file:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(vhb_dic, f, indent=2, ensure_ascii=False)
        print(f"VHB rankings saved in {output_file}\n")

    return vhb_dic

def generate_javascript_dict(vhb_dic, output_file = 'vhb_rankings.js'):
    """
    Generate a JavaScript file with the VHB rankings dictionary.
    
    Args:
        vhb_dic: A dictionary with the journal titles
        output_file: Path to save the JavaScript file
    """

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('var vhb_rankings = [\n')
        
        for i, (title, data) in enumerate(sorted(vhb_dic.items())):
            # Add comma for all lines except the last one
            comma = ',' if i < len(vhb_dic) - 1 else ''
            f.write(f'    "{title}": {{vhb: "{data["vhb"]}"}}{comma}\n')
        
        f.write('};\n')
    
    print(f"VHB JavaScript array saved to {output_file}")




if __name__ == "__main__":
    
    if len(sys.argv) < 2:
        print('!!! Filename not provided. Execute the script with the filename in the command line (e.g., python extract_xxx.py xxx-2024.csv)')
        exit()

    csv_file = sys.argv[1]
    
    if os.path.exists(csv_file):
        print('Import file exists')
    else:
        print('!!! Import file does not exist')
        exit()

    print("Extracting VHB rankings from CSV...")
    vhb_list = extract_VHB_rankings(csv_file)
    
    print(f"Found {len(vhb_list)} journals with rankings\n")
    
    # Generate JavaScript file
    generate_javascript_dict(vhb_list)
    
    # Print some sample entries
    print("\nSample entries:")
    for i, (title) in enumerate(list(vhb_list)[:5]):
        print(f"  {title}")




