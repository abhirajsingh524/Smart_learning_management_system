from werkzeug.security import check_password_hash

stored_hash = "pbkdf2:sha256:1000000$AOfY3d213EidqbpJ$d418b18d01abff912d9898fd82fe2352d5ed9733506a24e01fbecb66e516e947"

password = "4444444"

if check_password_hash(stored_hash, password):
    print("Password is correct")
else:
    print("Password is incorrect")