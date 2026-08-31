import re
import sys

pid = sys.argv[1]
maps_file = f"/proc/{pid}/maps"
mem_file = f"/proc/{pid}/mem"
found = False

try:
    with open(maps_file, 'r') as map_f, open(mem_file, 'rb', 0) as mem_f:
        for line in map_f.readlines():
            m = re.match(r'([0-9A-Fa-f]+)-([0-9A-Fa-f]+) ([-r])', line)
            if m.group(3) == 'r':
                start = int(m.group(1), 16)
                end = int(m.group(2), 16)
                try:
                    mem_f.seek(start)
                    chunk = mem_f.read(end - start)
                    idx = chunk.find(b"import PlayerManager")
                    if idx != -1 and b"ServerConsole" in chunk[idx:idx+2000]:
                        start_idx = max(0, idx - 4000)
                        end_idx = min(len(chunk), idx + 25000)
                        with open("recovered_old_ServerConsole.tsx", "wb") as out:
                            out.write(chunk[start_idx:end_idx])
                        print(f"Found old ServerConsole at {hex(start + idx)}")
                        found = True
                        break
                except Exception as e:
                    pass
            if found: break
except Exception as e:
    print(e)
