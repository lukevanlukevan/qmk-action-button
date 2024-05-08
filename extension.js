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

		if (folders.length === 1) {
			return [boardName, folders[0]]
		}

		keymapName = await vscode.window.showQuickPick(folders).then((selection) => {
			if (!selection) return null

			return selection
		})
	}

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

async function getExtraArgs(argKey) {
	let settings = vscode.workspace.getConfiguration("qmkActionButton")

	let extraArgs = settings.get(argKey)

	return extraArgs
}

async function activate(context) {
	let columnCommand = vscode.commands.registerCommand("qmk-action-button.columnKeymap", async function () {
		let activeEditor = vscode.window.activeTextEditor
		if (!activeEditor) {
			return
		}

		let selection = activeEditor.selection
		let selectedText = activeEditor.document.getText(selection)

		let leadingSpaces = selectedText.match(/^\s*/)[0].length

		let commastate = false
		if (selectedText.trim().endsWith(",")) {
			commastate = true
		}

		console.log(commastate)

		let lines = selectedText.split("\n")

		let longest = 0

		let lineArr = []

		lines.map((line) => {
			let wordArr = []
			let words = line.split(",")

			words
				.filter((word) => word.trim() !== ",")
				.map((word) => {
					let clean = word.trim()
					if (clean.length > longest) {
						longest = clean.length
					}
					wordArr.push(clean)
				})
			lineArr.push(wordArr)
		})

		let padding = 2 + longest

		let outputString = ""

		let wcount = lineArr[0].length

		lineArr.map((line, i) => {
			let lineStr = ""

			let linecount = line.length
			let diff = wcount - linecount

			let spacer = Math.floor(diff / 2)

			line.map((word) => {
				if (word !== "") {
					lineStr += (word + ",").padEnd(padding)
				}
			})

			if (diff !== 0) {
				outputString += " ".repeat((spacer - 1) * padding)
			}

			outputString += lineStr
			outputString += "\n"
		})

		let finalString = ""

		console.log(commastate)

		if (!commastate) {
			let ind = outputString.lastIndexOf(",")

			finalString = outputString.slice(0, ind)
		} else {
			finalString = outputString
		}

		activeEditor.edit((editBuilder) => {
			editBuilder.replace(selection, finalString)
		})
	})

	let compileCommand = vscode.commands.registerCommand("qmk-action-button.compile", async function () {
		let activeEditor = vscode.window.activeTextEditor
		if (!activeEditor) {
			return
		}

		let filePath = activeEditor.document.uri.fsPath

		let [boardName, keymapName] = await getBoardInfo(filePath)

		let extraArgs = await getExtraArgs("compileExtra")

		if (boardName === "" || keymapName === "") {
			vscode.window.showErrorMessage("Could not find keymap. Open file in keymap directory.")
			return
		}

		let terminal = vscode.window.terminals.find((t) => t.name === "QMK Terminal")

		if (!terminal) {
			terminal = vscode.window.createTerminal("QMK Terminal")
		}

		terminal.sendText(`qmk compile -kb ${boardName} -km ${keymapName}${extraArgs !== "" ? " " + extraArgs : ""}`, getRunType())

		terminal.show()
	})

	let flashCommand = vscode.commands.registerCommand("qmk-action-button.flash", async function (flashType) {
		let activeEditor = vscode.window.activeTextEditor
		if (!activeEditor) {
			return
		}

		let filePath = activeEditor.document.uri.fsPath

		let [boardName, keymapName] = await getBoardInfo(filePath)

		let extraArgs = await getExtraArgs("flashExtra")

		if (flashType === "left" || flashType === "right") {
			let precommand = await getExtraArgs("splitCommand")
			extraArgs = precommand.replace("{side}", flashType)
			console.log(extraArgs)

			if (extraArgs === "") {
				vscode.window.showErrorMessage("No split command defined. Please check extension settings.")
				return
			}
		}

		if (boardName === "" || keymapName === "") {
			vscode.window.showErrorMessage("Could not find keymap. Open file in keymap directory.")
			return
		}

		let terminal = vscode.window.terminals.find((t) => t.name === "QMK Terminal")

		if (!terminal) {
			terminal = vscode.window.createTerminal("QMK Terminal")
		}

		terminal.sendText(`qmk flash -kb ${boardName} -km ${keymapName}${extraArgs !== "" ? " " + extraArgs : ""}`, getRunType())

		terminal.show()
	})

	let menuCommand = vscode.commands.registerCommand("qmk-action-button.menu", function () {
		let commandList = ["QMK Compile", "QMK Flash"]

		let s = vscode.workspace.getConfiguration("qmkActionButton")
		if (s.get("showSplit") === true) {
			commandList.push("QMK Flash - Left")
			commandList.push("QMK Flash - Right")
		}

		vscode.window.showQuickPick(commandList).then(async (selection) => {
			if (!selection) return

			switch (selection) {
				case "QMK Compile":
					await vscode.commands.executeCommand("qmk-action-button.compile")
					break
				case "QMK Flash":
					await vscode.commands.executeCommand("qmk-action-button.flash")
					break
				case "QMK Flash - Left":
					await vscode.commands.executeCommand("qmk-action-button.flash", "left")
					break
				case "QMK Flash - Right":
					await vscode.commands.executeCommand("qmk-action-button.flash", "right")
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
