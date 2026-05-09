import json
import os
from pathlib import Path
from datetime import datetime

def load_json_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def compare_files(file1_path, file2_path):
    data1 = load_json_file(file1_path)
    data2 = load_json_file(file2_path)
    
    changes = []
    
    for country, status in data2.items():
        if country in data1:
            if data1[country] != status:
                changes.append({
                    'country': country,
                    'from': data1[country],
                    'to': status
                })
        else:
            changes.append({
                'country': country,
                'from': None,
                'to': status
            })
    
    for country in data1:
        if country not in data2:
            changes.append({
                'country': country,
                'from': data1[country],
                'to': None
            })
    
    return changes

def main():
    history_dir = Path('frontend/public/history')
    updates_file = Path('frontend/public/travel_updates.json')
    
    if not history_dir.exists():
        print(f"History directory not found: {history_dir}")
        return
    
    json_files = sorted(history_dir.glob('*.json'))
        
    # Load existing updates if file exists
    existing_updates = []
    if updates_file.exists():
        existing_updates = load_json_file(updates_file)
    
    # Build a set of already-recorded (date, country) pairs to avoid duplicates
    recorded = set()
    for entry in existing_updates:
        for change in entry.get('changes', []):
            recorded.add((entry['date'], change['country']))
    
    total_changes = 0
    dates_with_changes = []
    new_entries = []
    
    for i in range(len(json_files) - 1):
        file1 = json_files[i]
        file2 = json_files[i + 1]
        
        date1 = file1.stem
        date2 = file2.stem
        
        changes = compare_files(file1, file2)
        
        if changes:
            total_changes += len(changes)
            dates_with_changes.append(date2)

            # Only add changes not already recorded
            new_changes = [c for c in changes if (date2, c['country']) not in recorded]
            
            if new_changes:
                new_entries.append({
                    'date': date2,
                    'changes': new_changes
                })
            
            for change in changes:
                country = change['country']
                old = change['from'] or 'NEW'
                new = change['to'] or 'REMOVED'
    
    # Merge new entries with existing, sort by date descending
    all_updates = existing_updates + new_entries
    all_updates.sort(key=lambda x: x['date'], reverse=True)
    
    # Write to travel_updates.json
    with open(updates_file, 'w', encoding='utf-8') as f:
        json.dump(all_updates, f, indent=2)

if __name__ == '__main__':
    main()
