import Cocoa
import WebKit
let app=NSApplication.shared;app.setActivationPolicy(.prohibited)
class Bench:NSObject,WKNavigationDelegate,WKScriptMessageHandler{
 var web:WKWebView!; var window:NSWindow!; var started=false
 func start(){let config=WKWebViewConfiguration();config.websiteDataStore = .nonPersistent();config.userContentController.add(self,name:"benchmark");web=WKWebView(frame:NSRect(x:0,y:0,width:CGFloat(Int(CommandLine.arguments[3]) ?? 1440),height:1000),configuration:config);window=NSWindow(contentRect:NSRect(x:0,y:0,width:CGFloat(Int(CommandLine.arguments[3]) ?? 1440),height:1000),styleMask:[.borderless],backing:.buffered,defer:false);window.contentView=web;window.orderFrontRegardless();web.navigationDelegate=self;let url=URL(fileURLWithPath:CommandLine.arguments[1]);web.loadFileURL(url,allowingReadAccessTo:url.deletingLastPathComponent())}
 func userContentController(_ c:WKUserContentController,didReceive m:WKScriptMessage){print(m.body);fflush(stdout);if let text=m.body as? String,text.hasPrefix("RESULT:"){try? String(text.dropFirst(7)).write(toFile:CommandLine.arguments[2],atomically:true,encoding:.utf8);exit(0)};if let text=m.body as? String,text.hasPrefix("ERROR:"){exit(1)}}
 func webView(_ w:WKWebView,didFinish n:WKNavigation!){if started{return};started=true;print("Page loaded");fflush(stdout);w.evaluateJavaScript("window.runStudioBenchmark()",completionHandler:{_,e in if let error=e{print(error);exit(1)}})}
}
let b=Bench();b.start();DispatchQueue.main.asyncAfter(deadline:.now()+1800){print("TIMEOUT");exit(1)};app.run()
