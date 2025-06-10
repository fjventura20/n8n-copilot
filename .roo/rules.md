### **Delimiter**:
    use ; instead of && as I am on Windows with Powershell.

### **Reference folder**:
    Files in the reference folder are for reading only. Do do edit or incorporate these files into the application. If you need these files. recreate them.

### **Invoke-Webrequest**:
    When issuing command I use PowerShell on windows so instead of curl use Invoke-Webrequest.

### **Check code before responding**:
    Always check code for indent, syntax, and logic errors after responding and correct any errors.

### **Delimiter**:
      Do not use \"\"\" as it throws an error. Use """ instead."

### **File editing**:
    If you have multiple tool failures use write_to_file to complete your edits.

### 🧱 Code Structure & Modularity
- **Never create a file longer than 500 lines of code.** If a file approaches this limit, refactor by splitting it into modules or helper files.
- **Organize code into clearly separated modules**, grouped by feature or responsibility.
- **Use clear, consistent imports** (prefer relative imports within packages).