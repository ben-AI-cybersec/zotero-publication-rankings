import csv
import json
import os
import re

def extract_full_core_rankings(csv_file='full_CORE.csv'):
    """
    Extract comprehensive CORE conference rankings from full CSV file.
    Includes: Main CORE ranks (A*, A, B, C), Australasian, and National rankings.
    Prioritises the most recent source edition (e.g. ICORE2026 > CORE2023 > CORE2021).
    Returns a dictionary mapping conference names to their rankings.
    """
    core_rankings = {}
    best_entries = {}

    def extract_source_year(source):
        match = re.search(r'(19|20)\d{2}', source)
        return int(match.group(0)) if match else 0

    def source_priority(source):
        source_upper = source.upper()
        year = extract_source_year(source_upper)
        # Prefer newer years first, then prefer ICORE over CORE/others when years tie.
        return (year, 1 if source_upper.startswith('ICORE') else 0, 1 if source_upper.startswith('CORE') else 0)
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        # header = next(reader)  # full_CORE does not hava a header
        
        print("CSV Header: The file does not have a header")
        print("\nProcessing conferences...\n")
        
        for row in reader:
            if len(row) < 5:
                print(f"Ignored row: [{row}]")
                continue
            
            # Extract fields
            conference_name = row[1].strip()  # Title
            source = row[3].strip()  # e.g. CORE2023, ICORE2026
            raw_rank = row[4].strip()  # e.g. A*, A, B, C, TBR, Australasian, National
            
            if not conference_name:
                continue
            
            # Store valid rankings and keep only the highest-priority source for each conference.
            if raw_rank in ['A*', 'A', 'B', 'C']:
                edition_year = extract_source_year(source)
                edition = str(edition_year) if edition_year else source
                normalized_rank = f"{raw_rank} [{edition}]"
            # Australasian rankings
            elif raw_rank.startswith('Australasian'):
                normalized_rank = raw_rank.replace('Australasian', 'Au')
            # National rankings  
            elif raw_rank.startswith('National'):
                normalized_rank = raw_rank.replace('National', 'Nat')
            # TBR (To Be Ranked)
            elif raw_rank == 'TBR':
                normalized_rank = 'TBR'
            else:
                continue

            candidate_priority = source_priority(source)
            current = best_entries.get(conference_name)

            if current is None or candidate_priority > current['priority']:
                best_entries[conference_name] = {
                    'priority': candidate_priority,
                    'rank': normalized_rank
                }

    for conference_name, data in best_entries.items():
        core_rankings[conference_name] = data['rank']
    
    print(f"Total conferences extracted: {len(core_rankings)}")
    
    # Count by rank
    rank_counts = {}
    for rank in core_rankings.values():
        base_rank = rank.split()[0]  # Get 'A*', 'A', 'B', etc.
        rank_counts[base_rank] = rank_counts.get(base_rank, 0) + 1
    
    print("\nRanking distribution:")
    for rank in sorted(rank_counts.keys()):
        print(f"  {rank}: {rank_counts[rank]}")
    
    # Save to JSON file
    with open('core_rankings.json', 'w', encoding='utf-8') as f:
        json.dump(core_rankings, f, indent=2, ensure_ascii=False)
    
    # Save as JavaScript object
    with open('core_rankings.js', 'w', encoding='utf-8') as f:
        f.write('var coreRankings = ')
        json.dump(core_rankings, f, indent=2, ensure_ascii=False)
        f.write(';\n')
    
    print(f"\nSaved to core_rankings.json and core_rankings.js")
    
    return core_rankings

if __name__ == '__main__':
    rankings = extract_full_core_rankings()

    if os.path.exists('full_CORE.csv'):
        print('Import file exists')
    else:
        print('!!! Import file does not exist')
        exit()
    
    
    # Show examples from each category
    print("\n=== Example Rankings ===")
    
    categories = {
        'A*': [],
        'A': [],
        'B': [],
        'C': [],
        'Au': [],
        'Nat': [],
        'TBR': []
    }
    
    for conf, rank in rankings.items():
        base_rank = rank.split()[0]
        if base_rank in categories and len(categories[base_rank]) < 3:
            categories[base_rank].append((conf, rank))
    
    for cat, examples in categories.items():
        if examples:
            print(f"\n{cat} tier examples:")
            for conf, rank in examples:
                print(f"  {conf}: {rank}")
