with open("src/components/ServerConsole.tsx", "rb") as f:
    data = f.read()

text = data.decode("utf-8", "ignore")
anchor = text.find('style={{ width: `${diskPct}%` }}')
if anchor != -1:
    end = text.find('    </div>', anchor)
    end = text.find('    </div>', end + 5)
    end = text.find('    </div>', end + 5)
    end = text.find('    </div>', end + 5)
    end = text.find('    </div>', end + 5)
    if end != -1:
        final_text = text[:end + 10] + "\n  );\n}\n"
        with open("src/components/ServerConsole.tsx", "w") as out:
            out.write(final_text)
        print("Fixed!")
    else:
        print("End not found")
else:
    print("Anchor not found")
