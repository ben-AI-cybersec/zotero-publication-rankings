import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

# Reads the ABDC Journal Quality List workbook directly (no openpyxl needed).
# Download from https://abdc.edu.au/abdc-journal-quality-list/

NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}


def read_sheet_rows(xlsx_path, sheet_name=None):
    """
    Yield the rows of one worksheet as lists of strings.

    Args:
        xlsx_path: Path to the .xlsx file
        sheet_name: Worksheet to read (default: the first one)
    """
    z = zipfile.ZipFile(xlsx_path)

    shared = []
    if 'xl/sharedStrings.xml' in z.namelist():
        for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si', NS):
            shared.append(''.join(t.text or '' for t in si.iter('{%s}t' % NS['m'])))

    workbook = ET.fromstring(z.read('xl/workbook.xml'))
    rels = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
    targets = {r.get('Id'): r.get('Target') for r in rels}
    sheets = [(s.get('name'), targets[s.get('{%s}id' % NS['r'])]) for s in workbook.find('m:sheets', NS)]
    name, target = next((s for s in sheets if s[0] == sheet_name), sheets[0]) if sheet_name else sheets[0]
    target = target.lstrip('/')
    if not target.startswith('xl/'):
        target = 'xl/' + target
    print(f"Reading sheet '{name}'")

    def col_index(ref):
        n = 0
        for ch in re.match(r'[A-Z]+', ref).group(0):
            n = n * 26 + ord(ch) - 64
        return n - 1

    for row in ET.fromstring(z.read(target)).iter('{%s}row' % NS['m']):
        cells = {}
        for c in row.findall('m:c', NS):
            v = c.find('m:v', NS)
            if c.get('t') == 'inlineStr':
                val = ''.join(x.text or '' for x in c.iter('{%s}t' % NS['m']))
            elif v is None:
                continue
            elif c.get('t') == 's':
                val = shared[int(v.text)]
            else:
                val = v.text
            cells[col_index(c.get('r'))] = val
        if cells:
            yield [cells.get(i, '') for i in range(max(cells) + 1)]


def clean_issn(value):
    """'1619-4500\\t' or '2319-7145\\u200e' -> '16194500'; anything else -> ''"""
    value = re.sub(r'[^0-9Xx]', '', value or '').upper()
    return value if re.fullmatch(r'\d{7}[\dX]', value) else ''


def extract_abdc_rankings(xlsx_path, output_file='abdc_rankings.json'):
    """
    Extract ABDC ratings from the Journal Quality List workbook.

    The current list is the first sheet ("2025 JQL"); older lists are on later sheets.
    The header row contains "Journal Title", "ISSN", "ISSNOnline" and "<year> rating".

    Returns:
        Dictionary with journal titles (lowercase) as keys and dict with ABDC rating + ISSNs
    """
    abdc_dict = {}
    header = None
    for row in read_sheet_rows(xlsx_path):
        cells = [c.strip() for c in row]
        if header is None:
            if 'Journal Title' in cells:
                header = {name: i for i, name in enumerate(cells)}
                col_title = header['Journal Title']
                col_issn = header['ISSN']
                col_issn_online = next(i for n, i in header.items() if n.replace(' ', '').lower() == 'issnonline')
                col_rating = next(i for n, i in header.items() if n.lower().endswith('rating'))
            continue

        def cell(i):
            return row[i] if i < len(row) else ''

        title = re.sub(r'\s+', ' ', cell(col_title)).strip()
        rating = cell(col_rating).strip()
        if not title or rating not in ('A*', 'A', 'B', 'C'):
            if title:
                print(f"Warning: skipping '{title}' with rating '{rating}'")
            continue

        issns = [i for i in (clean_issn(cell(col_issn)), clean_issn(cell(col_issn_online))) if i]
        abdc_dict[title.lower()] = {
            'abdc': rating,
            'issn': ','.join(dict.fromkeys(issns))
        }

    if header is None:
        print("!!! No 'Journal Title' header row found")
        sys.exit(1)

    if output_file:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(abdc_dict, f, indent=2, ensure_ascii=False)
        print(f"ABDC rankings saved in {output_file}\n")

    return abdc_dict


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print('!!! Filename not provided. Execute the script with the filename in the command line (e.g., python extract_abdc.py ABDC-JQL-2025.xlsx)')
        sys.exit(1)

    abdc_dict = extract_abdc_rankings(sys.argv[1])
    print(f"{len(abdc_dict)} journals added")

    print("\nSample entries:")
    for title, data in list(abdc_dict.items())[:5]:
        print(f"  {title}: {data}")
