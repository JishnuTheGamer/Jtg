import re

with open("mem_dump.txt", "rb") as f:
    data = f.read()

start_idx = data.find(b"import React, { useCallback")
if start_idx != -1:
    end_idx = data.find(b"export default ServerConsole;", start_idx)
    if end_idx != -1:
        end_idx += len(b"export default ServerConsole;")
        content = data[start_idx:end_idx].decode("utf-8", "ignore")
        with open("recovered_ServerConsole.tsx", "w") as out:
            out.write(content)
        print(f"Recovered {len(content)} characters to recovered_ServerConsole.tsx")
    else:
        print("End not found")
else:
    print("Start not found")
