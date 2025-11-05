import csv
import json

def extract_full_core_rankings(csv_file='full_CORE.csv'):
    """
    Extract comprehensive CORE conference rankings from full CSV file.
    Includes: Main CORE ranks (A*, A, B, C), Australasian, and National rankings.
    Also includes historical data (2021, 2023 editions).
    Returns a dictionary mapping conference names to their rankings.
    """
    core_rankings = {}
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)  # Skip header row
        
        print("CSV Header:", header)
        print("\nProcessing conferences...\n")
        
        for row in reader:
            if len(row) < 10:
                continue
            
            # Extract fields
            conference_name = row[1].strip()  # Title
            rank_2023 = row[4].strip()  # 2023 Rank
            rank_2021 = row[5].strip()  # 2021 Rank
            
            if not conference_name:
                continue
            
            # Primary ranking: use 2023, fall back to 2021
            primary_rank = rank_2023 if rank_2023 else rank_2021
            
            # Store the primary ranking with edition info
            if primary_rank in ['A*', 'A', 'B', 'C']:
                edition = '2023' if rank_2023 else '2021'
                core_rankings[conference_name] = f"{primary_rank} [{edition}]"
            # Australasian rankings
            elif primary_rank.startswith('Australasian'):
                core_rankings[conference_name] = primary_rank.replace('Australasian', 'Au')
            # National rankings  
            elif primary_rank.startswith('National'):
                core_rankings[conference_name] = primary_rank.replace('National', 'Nat')
            # TBR (To Be Ranked)
            elif primary_rank == 'TBR':
                core_rankings[conference_name] = 'TBR'
    
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
