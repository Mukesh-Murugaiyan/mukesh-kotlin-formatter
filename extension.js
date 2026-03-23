const vscode = require('vscode');
const { exec } = require('child_process');

function activate(context) {

    console.log('Kotlin Formatter is now active! 🚀');

    const formatDisposable = vscode.commands.registerCommand('kotlinFormatter.format', function () {

        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            vscode.window.showErrorMessage("No active file ❌");
            return;
        }

        const document = editor.document;
        const filePath = document.fileName;

        if (!filePath.endsWith('.kt') && !filePath.endsWith('.kts')) {
            vscode.window.showErrorMessage("This is not a Kotlin or Kotlin Script file ❌");
            return;
        }

        // Save the document first so ktlint has the latest changes on disk
        document.save().then(() => {
            exec(`ktlint -F "${filePath}"`, (err, stdout, stderr) => {
                if (err && stderr) {
                    vscode.window.showErrorMessage("Formatting failed ❌ (Check ktlint output)");
                } else {
                    vscode.window.showInformationMessage("Kotlin formatted successfully ✅");
                }

                // Revert to load the formatted changes from disk into the editor
                vscode.commands.executeCommand('workbench.action.files.revert');
            });
        });
    });

    const formatSelectionDisposable = vscode.commands.registerCommand('kotlinFormatter.formatSelection', function () {
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            vscode.window.showErrorMessage("No active file ❌");
            return;
        }

        const document = editor.document;
        const filePath = document.fileName;

        if (!filePath.endsWith('.kt') && !filePath.endsWith('.kts')) {
            vscode.window.showErrorMessage("This is not a Kotlin or Kotlin Script file ❌");
            return;
        }

        const selection = editor.selection;
        if (selection.isEmpty) {
            vscode.window.showErrorMessage("No code selected to format ❌");
            return;
        }

        const selectedText = document.getText(selection);
        
        // Find base indentation of the first line to reapply to formatted output
        const match = selectedText.match(/^[ \t]*/);
        const baseIndentation = match ? match[0] : "";

        const child = exec(`ktlint -F --stdin --log-level=error`, (err, stdout, stderr) => {
            if (err && stderr) {
                if (stderr.includes("Not a valid Kotlin file") || stderr.includes("Can not parse input")) {
                     vscode.window.showErrorMessage("Format failed ❌: Make sure you highlight a COMPLETE block of code with matching brackets (})!");
                } else {
                     vscode.window.showErrorMessage("Formatting selection failed ❌ (Check ktlint output in terminal)");
                }
                return;
            }

            let formattedText = stdout.replace(/\r?\n$/, '');

            // reapply base indentation to all lines (split cross-platform)
            const lines = formattedText.split(/\r?\n/);
            const reindentedText = lines.map(line => line.length > 0 ? baseIndentation + line : line).join('\n');

            editor.edit(editBuilder => {
                editBuilder.replace(selection, reindentedText);
            }).then(success => {
                if (success) {
                    vscode.window.showInformationMessage("Selected Kotlin formatted successfully ✅");
                }
            });
        });

        // Write the selection text to ktlint stdin
        child.stdin.write(selectedText);
        child.stdin.end();
    });

    context.subscriptions.push(formatDisposable, formatSelectionDisposable);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};