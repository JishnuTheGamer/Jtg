with open("recovered_ServerConsole.tsx", "rb") as f:
    data = f.read()

text = data.decode("utf-8", "ignore")
end_idx = text.find("  );\n}\n")
if end_idx != -1:
    with open("src/components/ServerConsole.tsx", "w") as f:
        f.write(text[:end_idx + 7])
    print("Found end!")
else:
    print("End not found")
