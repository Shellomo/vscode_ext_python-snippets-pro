import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getWebviewContent } from './webview/webviewContent';
import { Snippet, SnippetDictionary } from './types';

export class SnippetWebviewPanel {
    public static currentPanel: SnippetWebviewPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionPath: string;
    private _disposables: vscode.Disposable[] = [];
    private _snippetsPath: string;

    private constructor(panel: vscode.WebviewPanel, extensionPath: string) {
        this._panel = panel;
        this._extensionPath = extensionPath;
        this._snippetsPath = path.join(extensionPath, 'snippets', 'snippets.json');

        this._update();

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'addSnippet':
                        await this._addSnippet(message.snippet);
                        break;
                    case 'editSnippet':
                        await this._editSnippet(message.name, message.snippet);
                        break;
                    case 'deleteSnippet':
                        await this._deleteSnippet(message.name);
                        break;
                    case 'insertSnippet':
                        await this._insertSnippet(message.snippet);
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    public static createOrShow(extensionPath: string) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (SnippetWebviewPanel.currentPanel) {
            SnippetWebviewPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'snippetBrowser',
            'Python Snippets',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.file(path.join(extensionPath, 'media'))]
            }
        );

        SnippetWebviewPanel.currentPanel = new SnippetWebviewPanel(panel, extensionPath);
    }

    private async _update() {
        try {
            const snippetsContent = await fs.promises.readFile(this._snippetsPath, 'utf8');
            const snippets: SnippetDictionary = JSON.parse(snippetsContent);
            this._panel.webview.html = getWebviewContent(snippets);
        } catch (error) {
            vscode.window.showErrorMessage('Error loading snippets: ' + (error as Error).message);
        }
    }

    private async _addSnippet(snippet: Snippet) {
        try {
            const snippets = JSON.parse(await fs.promises.readFile(this._snippetsPath, 'utf8'));
            snippets[snippet.prefix] = snippet;
            await fs.promises.writeFile(this._snippetsPath, JSON.stringify(snippets, null, 4));
            await this._update();
            vscode.window.showInformationMessage('Snippet added successfully!');
        } catch (error) {
            vscode.window.showErrorMessage('Error adding snippet: ' + (error as Error).message);
        }
    }

    private async _editSnippet(name: string, snippet: Snippet) {
        try {
            console.log('_editSnippet', name, snippet);
            const snippets = JSON.parse(await fs.promises.readFile(this._snippetsPath, 'utf8'));
            delete snippets[name];
            snippets[snippet.prefix] = snippet;
            await fs.promises.writeFile(this._snippetsPath, JSON.stringify(snippets, null, 4));
            await this._update();
            vscode.window.showInformationMessage('Snippet updated successfully!');
        } catch (error) {
            vscode.window.showErrorMessage('Error updating snippet: ' + (error as Error).message);
        }
    }

    private async _deleteSnippet(name: string) {
        try {
            console.log('_deleteSnippet', name);
            const snippets = JSON.parse(await fs.promises.readFile(this._snippetsPath, 'utf8'));
            delete snippets[name];
            await fs.promises.writeFile(this._snippetsPath, JSON.stringify(snippets, null, 4));
            await this._update();
            vscode.window.showInformationMessage('Snippet deleted successfully!');
        } catch (error) {
            vscode.window.showErrorMessage('Error deleting snippet: ' + (error as Error).message);
        }
    }

    private async _insertSnippet(snippet: Snippet) {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const snippetString = new vscode.SnippetString(snippet.body.join('\n'));
            await editor.insertSnippet(snippetString);
        }
    }

    public dispose() {
        SnippetWebviewPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}