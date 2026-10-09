# DOCX template database

`docx_store.py` stores template files in `Database/templates/` and maintains
their numeric references in `temp_index.json`. The index keeps its existing
`{"Table": {"template_name": reference_number}}` format for
`LLM/template_selector.py`.

```python
from Database.docx_store import (
    delete_document,
    get_document_by_index,
    get_document_path,
    insert_document,
    list_documents,
)

reference = insert_document("forms/Leave Application.docx")
path = get_document_path(reference)
same_path = get_document_by_index(reference)
print(list_documents())
delete_document(reference)
```

Names are normalized to lowercase keys with underscores. A new template gets
the next number after the largest number in the index. Re-inserting an indexed
template whose file is missing restores the file at its original reference.
Replacing an existing file requires `replace=True`. Deletion accepts either
the template name or its numeric reference.

The insertion function checks that the source is a readable DOCX package,
copies it in chunks, and writes the JSON index atomically. Keep the index and
`templates/` directory together when backing up or moving the database.
