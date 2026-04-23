import json
from pathlib import Path


class UserStore:
    def __init__(self, path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if not self.path.exists():
            self._write([])

    def _read(self):
        try:
            with self.path.open("r", encoding="utf-8") as handle:
                data = json.load(handle)
            return data if isinstance(data, list) else []
        except (OSError, json.JSONDecodeError):
            return []

    def _write(self, rows):
        with self.path.open("w", encoding="utf-8") as handle:
            json.dump(rows, handle, indent=2)

    def find_by_email(self, email):
        normalized = (email or "").strip().lower()
        for row in self._read():
            if row.get("email") == normalized:
                return row
        return None

    def create(self, row):
        rows = self._read()
        rows.append(row)
        self._write(rows)
        return row

    def list_all(self):
        return self._read()

    def find_by_id(self, user_id):
        target = str(user_id)
        for row in self._read():
            if str(row.get("id")) == target:
                return row
        return None

    def update_by_id(self, user_id, updates):
        target = str(user_id)
        rows = self._read()
        updated = None
        for idx, row in enumerate(rows):
            if str(row.get("id")) == target:
                row.update(updates)
                rows[idx] = row
                updated = row
                break
        if updated is None:
            return None
        self._write(rows)
        return updated

    def delete_by_id(self, user_id):
        target = str(user_id)
        rows = self._read()
        kept = [row for row in rows if str(row.get("id")) != target]
        if len(kept) == len(rows):
            return False
        self._write(kept)
        return True
