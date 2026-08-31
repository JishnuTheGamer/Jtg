with open("recovered_ServerConsole.tsx", "rb") as f:
    data = f.read()

text = data.decode("utf-8", "ignore")

# Find the start
start_idx = text.find('import React, { useCallback')
end_idx = text.find('      </div>\n    </div>', start_idx)
if end_idx != -1:
    end_idx = text.find('</div>', end_idx + 15)
    end_idx = text.find('</div>', end_idx + 3)
    end_idx += 6

with open("src/components/ServerConsole.tsx", "w") as f:
    f.write(text[start_idx:end_idx] + "\n  );\n}\n")
    print(f"Saved {end_idx - start_idx} chars to src/components/ServerConsole.tsx")
