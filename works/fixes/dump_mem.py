import re
import sys
import os

pid = sys.argv[1]
maps_file = f"/proc/{pid}/maps"
mem_file = f"/proc/{pid}/mem"

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
                    idx = chunk.find(b"import React, { useCallback")
                    if idx != -1 and b"ServerConsole" in chunk[idx:idx+1000]:
                        start_idx = idx
                        end_idx = min(len(chunk), idx + 35000)
                        with open("recovered_ServerConsole.tsx", "wb") as out:
                            out.write(chunk[start_idx:end_idx])
                        print(f"Dumped at {hex(start + idx)}")
                except Exception as e:
                    pass
except Exception as e:
    print(e)
