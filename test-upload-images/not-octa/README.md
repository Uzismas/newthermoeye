# Images that are NOT OCTA

Drop photos, cartoons, screenshots, fundus photos, etc. here (they stay on this computer; images in this folder are git-ignored).
Then check what the OCTA gate does with them:

    backend\.venv\Scripts\python.exe scripts\check_octa_gate.py test-upload-images\not-octa

Every image here should print REFUSED. If one prints "ACCEPTED as OCTA", keep it here and report it so the gate can be tuned.
