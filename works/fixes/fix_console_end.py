with open("src/components/ServerConsole.tsx", "r", encoding="utf-8") as f:
    text = f.read()

end_idx = text.rfind('  );')
if end_idx != -1:
    with open("src/components/ServerConsole.tsx", "w", encoding="utf-8") as f:
        f.write(text[:end_idx])
        f.write("      </div>\n    </div>\n  );\n}\n")
    print("Fixed!")
else:
    print("Not found")
