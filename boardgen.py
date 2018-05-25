
cols = 'abcdefgh'
print('<table class="board">')

print("  <tr>")
print("  <td></td>")
for c in cols:
    print(f'    <th class="board-header file">{c}</th>')
print("  <td></td>")
print("  <tr>")

for r in range(8, 0, -1):
    print("  <tr>")
    print(f'    <th class="board-header rank">{r}</th>')
    for c in range(8):
        print(f"""    <td id="space-{cols[c]}{r}" class="board-space {'dark' if (r+c)%2 else 'light'} square"></td>""")
    print(f'    <th class="board-header rank">{r}</th>')
    print("  </tr>")

print("  <tr>")
print("    <td></td>")
for c in cols:
    print(f'    <th class="board-header file">{c}</th>')
print("    <td></td>")
print("  <tr>")

print("</table>")
