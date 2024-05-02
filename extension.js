const vscode = require("vscode")
const path = require("path")
const fs = require("fs")

async function getBoardInfo(filePath) {
	let sep = path.sep

	let inKeymap = false
	let boardName = ""
	let keymapName

	let kbindex = -1
	let kmindex = -1

	let splitpath = filePath.split(sep)

	for (let i = splitpath.length - 1; i >= 0; i--) {
		if (splitpath[i] === "keyboards") kbindex = i
		if (splitpath[i] === "keymaps") kmindex = i
		if (splitpath[i] === "keymaps") inKeymap = true
	}

	let boardPath = splitpath.slice(0, kmindex).join(sep) + sep + "keymaps"

	boardName = splitpath.slice(kbindex + 1, kmindex).join("/")

	keymapName = splitpath[kmindex + 1]

	if (!inKeymap) {
		const folders = fs
			.readdirSync(boardPath, { withFileTypes: true })
			.filter((dirent) => dirent.isDirectory())
			.map((dirent) => dirent.name)

		keymapName = await vscode.window.showQuickPick(folders).then((selection) => {
			if (!selection) return null

			return selection
		})
	}

	console.log(boardName, keymapName)

	return [boardName, keymapName]
}

function getRunType() {
	let settings = vscode.workspace.getConfiguration("qmkActionButton")

	let runType = false

	if (settings.get("runType") === "Paste and execute") {
		runType = true
	} else {
		runType = false
	}

	return runType
}

async function activate(context) {
	let compileCommand = vscode.commands.registerCommand("qmk-action-button.compile", async function () {
		let activeEditor = vscode.window.activeTextEditor
		if (!activeEditor) {
			return
		}

		let filePath = activeEditor.document.uri.fsPath

		let [boardName, keymapName] = await getBoardInfo(filePath)

		console.log(boardName, keymapName)

		if (boardName === "" || keymapName === "") {
			vscode.window.showErrorMessage("Could not find keymap. Open file in keymap directory.")
			return
		}

		let terminal = vscode.window.terminals.find((t) => t.name === "QMK Terminal")

		if (!terminal) {
			terminal = vscode.window.createTerminal("QMK Terminal")
		}

		terminal.sendText(`qmk compile -kb ${boardName} -km ${keymapName}`, getRunType())

		terminal.show()
	})

	let flashCommand = vscode.commands.registerCommand("qmk-action-button.flash", async function () {
		let activeEditor = vscode.window.activeTextEditor
		if (!activeEditor) {
			return
		}

		let filePath = activeEditor.document.uri.fsPath

		let [boardName, keymapName] = await getBoardInfo(filePath)

		if (boardName === "" || keymapName === "") {
			vscode.window.showErrorMessage("Could not find keymap. Open file in keymap directory.")
			return
		}

		let terminal = vscode.window.terminals.find((t) => t.name === "QMK Terminal")

		if (!terminal) {
			terminal = vscode.window.createTerminal("QMK Terminal")
		}

		terminal.sendText(`qmk flash -kb ${boardName} -km ${keymapName}`, getRunType())

		terminal.show()
	})

	let menuCommand = vscode.commands.registerCommand("qmk-action-button.menu", function () {
		vscode.window.showQuickPick(["QMK Compile", "QMK Flash"]).then(async (selection) => {
			if (!selection) return

			switch (selection) {
				case "QMK Compile":
					await vscode.commands.executeCommand("qmk-action-button.compile")
					break
				case "QMK Flash":
					await vscode.commands.executeCommand("qmk-action-button.flash")
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
