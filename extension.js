const vscode = require("vscode")
const path = require("path")

function getBoardInfo(filePath) {
	let sep = path.sep

	let inKeymap = false
	let boardName = ""
	let keymapName = ""

	let kbindex = -1
	let kmindex = -1

	let splitpath = filePath.split(sep)

	for (let i = splitpath.length - 1; i >= 0; i--) {
		if (splitpath[i] === "keyboards") kbindex = i
		if (splitpath[i] === "keymaps") kmindex = i
		if (splitpath[i] === "keymaps") inKeymap = true
	}

	if (!inKeymap) {
		return ["", ""]
	} else {
		boardName = splitpath.slice(kbindex + 1, kmindex).join("/")
	}

	keymapName = splitpath[kmindex + 1]

	return [boardName, keymapName]
}

function activate(context) {
	let compileCommand = vscode.commands.registerCommand("qmk-action-button.compile", function () {
		let activeEditor = vscode.window.activeTextEditor
		if (!activeEditor) {
			return
		}

		let filePath = activeEditor.document.uri.fsPath

		let [boardName, keymapName] = getBoardInfo(filePath)

		if (boardName === "" || keymapName === "") {
			vscode.window.showErrorMessage("Could not find keymap. Open file in keymap directory.")
			return
		}

		let terminal = vscode.window.terminals.find((t) => t.name === "QMK Compile Terminal")

		if (!terminal) {
			terminal = vscode.window.createTerminal("QMK Compile Terminal")
		}

		terminal.sendText(`qmk compile -kb ${boardName} -km ${keymapName}`)

		terminal.show()
	})

	let flashCommand = vscode.commands.registerCommand("qmk-action-button.flash", function () {
		let activeEditor = vscode.window.activeTextEditor
		if (!activeEditor) {
			return
		}

		let filePath = activeEditor.document.uri.fsPath

		let [boardName, keymapName] = getBoardInfo(filePath)

		if (boardName === "" || keymapName === "") {
			vscode.window.showErrorMessage("Could not find keymap. Open file in keymap directory.")
			return
		}

		let terminal = vscode.window.terminals.find((t) => t.name === "QMK Compile Terminal")

		if (!terminal) {
			terminal = vscode.window.createTerminal("QMK Compile Terminal")
		}

		terminal.sendText(`qmk flash -kb ${boardName} -km ${keymapName}`)

		terminal.show()
	})

	let menuCommand = vscode.commands.registerCommand("qmk-action-button.menu", function () {
		vscode.window.showQuickPick(["QMK Compile", "QMK Flash"]).then((selection) => {
			if (!selection) return

			switch (selection) {
				case "QMK Compile":
					vscode.commands.executeCommand("qmk-action-button.compile")
					break
				case "QMK Flash":
					vscode.commands.executeCommand("qmk-action-button.flash")
					break
			}
		})
	})

	context.subscriptions.push(compileCommand, flashCommand, menuCommand)
}

function deactivate() {}

module.exports = {
	activate,
	deactivate,
}

