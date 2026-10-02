import sys
for p in sys.argv[1:]:
    try:
        f = open(p, 'rb')
    except Exception as e:
        print(p.split('/')[-1], "NUK HAPET", flush=True); continue
    pack = total = 0
    try:
        while True:
            c = f.read(1048576)
            if not c: break
            for i in range(0, len(c), 2048):
                total += 1
                if c[i:i+4] == b'\x00\x00\x01\xba': pack += 1
    except Exception:
        pass
    f.close()
    print(p.split('/')[-1], "%.1f%%" % (100*pack/total if total else 0), "e shendoshe", flush=True)
