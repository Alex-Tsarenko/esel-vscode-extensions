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

  // Output и Trace каналы обязательно с { log: true }
  const outputChannel = vscode.window.createOutputChannel("C++ TCP LSP", { log: true });
  const traceChannel = vscode.window.createOutputChannel("C++ TCP LSP Trace", { log: true });

  outputChannel.info("🚀 Activating TCP LSP extension..."); // Используйте .info для корректной маркировки лога
  outputChannel.show(true);

  const serverOptions: ServerOptions = () =>
    new Promise<StreamInfo>((resolve, reject) => {
      const socket = net.connect(serverPort, "localhost", () => {
        outputChannel.info("✅ TCP socket connected to C++ LSP server");
        resolve({ reader: socket, writer: socket });
      });

      socket.on("error", (err: any) => {
        outputChannel.error(`❌ TCP socket error: ${err}`);
        reject(err);
      });
    });

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: "file", language: "esel" }],
    outputChannel, // логи клиента
    revealOutputChannelOn: 1,
    traceOutputChannel: traceChannel, // для trace-логов протокола
    middleware: {
      handleDiagnostics: (uri, diagnostics, next) => {
        outputChannel.info(
          `📌 Diagnostics for ${uri.toString()}: ${JSON.stringify(diagnostics)}`
        );
        next(uri, diagnostics);
      },
    }
  };

  client = new LanguageClient(
    "cppTcpLsp",
    "C++ TCP LSP",
    serverOptions,
    clientOptions
  );

  client.start().then(() => {
    outputChannel.info("✅ LanguageClient started");
  }).catch((err: any) => {
    outputChannel.error(`❌ LanguageClient failed to start: ${err}`);
  });

  vscode.workspace.onDidOpenTextDocument(doc => {
    outputChannel.info(`📄 Opened document: ${doc.fileName}`);
  });

  vscode.workspace.onDidCloseTextDocument(doc => {
    outputChannel.info(`❌ Closed document: ${doc.fileName}`);
  });

  vscode.workspace.onDidChangeTextDocument(event => {
    if (
      event.document.languageId === 'esel' &&
      event.contentChanges.length > 0
    ) {
      outputChannel.info(`✏ Document changed: ${event.document.fileName}`);
    }
  });

  context.subscriptions.push(client);
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) return undefined;
  return client.stop();
}
