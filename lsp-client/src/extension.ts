import * as net from "net";
import * as vscode from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  StreamInfo
} from "vscode-languageclient/node";

let client: LanguageClient | undefined;

export function activate(context: vscode.ExtensionContext) {
  const serverPort = 2087;

  // Output и Trace каналы
  const outputChannel = vscode.window.createOutputChannel("C++ TCP LSP");
  const traceChannel = vscode.window.createOutputChannel("C++ TCP LSP Trace");

  outputChannel.appendLine("🚀 Activating TCP LSP extension...");

  // ServerOptions для TCP LSP
  const serverOptions: ServerOptions = () =>
    new Promise<StreamInfo>((resolve, reject) => {
      const socket = net.connect(serverPort, "127.0.0.1", () => {
        outputChannel.appendLine("✅ TCP socket connected to C++ LSP server");
        resolve({ reader: socket, writer: socket });
      });

      socket.on("error", (err: any) => {
        outputChannel.appendLine(`❌ TCP socket error: ${err}`);
        reject(err);
      });
    });

  // LanguageClient options
  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: "file", language: "esel" }],
    outputChannel,
    revealOutputChannelOn: 4, // Errors
    traceOutputChannel: traceChannel,
    middleware: {
      handleDiagnostics: (uri, diagnostics, next) => {
        outputChannel.appendLine(`📌 Diagnostics for ${uri.toString()}: ${JSON.stringify(diagnostics)}`);
        next(uri, diagnostics);
      }
    }
  };

  // Создание LanguageClient
  client = new LanguageClient(
    "cppTcpLsp",
    "C++ TCP LSP",
    serverOptions,
    clientOptions
  );

  // Запуск клиента с логированием в OutputChannel
  client.start().then(() => {
    outputChannel.appendLine("✅ LanguageClient started");
  }).catch((err: any) => {
    outputChannel.appendLine(`❌ LanguageClient failed to start: ${err}`);
  });

  // Лог открытия документов
  vscode.workspace.onDidOpenTextDocument(doc => {
    outputChannel.appendLine(`📄 Opened document: ${doc.fileName}`);
  });

  // Лог закрытия документов (по желанию)
  vscode.workspace.onDidCloseTextDocument(doc => {
    outputChannel.appendLine(`❌ Closed document: ${doc.fileName}`);
  });

  // Лог изменений текста
  vscode.workspace.onDidChangeTextDocument(event => {
    outputChannel.appendLine(`✏ Document changed: ${event.document.fileName}`);
  });

  context.subscriptions.push(client);
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) return undefined;
  return client.stop();
}
