/**
 * UIScene lifecycle (2026-11-08). iOS 27 refuses to launch an app built with its SDK that has no scene manifest:
 * build 1.0.4 (46), the first one built with Xcode 27, died on launch in
 * `_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption` (EXC_BREAKPOINT). Expo SDK 55's template still
 * starts React Native in the AppDelegate's own window, so this moves that start into a SceneDelegate: the app
 * delegate builds the React Native factory, the scene gives it its window. Links that open the app are forwarded
 * to the app delegate, where Expo's subscribers and RCTLinkingManager already handle them.
 * `ios/` is generated (expo prebuild): this is the only place the change lives.
 */
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins')

const MARCA = '// with-scenes:'

const ARRANQUE =
  /#if os\(iOS\) \|\| os\(tvOS\)\s*\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\s*\n\s*factory\.startReactNative\([\s\S]*?\)\s*\n#endif\n/

const ESCENA = `
${MARCA} iOS 27 requires the scene lifecycle; React Native starts in the scene's window.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let factory = appDelegate.reactNativeFactory else { return }
    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window
    // A link that cold-starts the app arrives here, not in launchOptions: hand it to Linking.getInitialURL().
    var launchOptions: [UIApplication.LaunchOptionsKey: Any] = [:]
    if let url = connectionOptions.urlContexts.first?.url { launchOptions[.url] = url }
    factory.startReactNative(withModuleName: "main", in: window, launchOptions: launchOptions)
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    for context in URLContexts {
      _ = UIApplication.shared.delegate?.application?(UIApplication.shared, open: context.url, options: [:])
    }
  }
}
`

module.exports = function withScenes(config) {
  config = withInfoPlist(config, (c) => {
    c.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    }
    return c
  })
  return withAppDelegate(config, (c) => {
    let s = c.modResults.contents
    if (s.includes(MARCA)) return c
    if (c.modResults.language !== 'swift' || !ARRANQUE.test(s)) {
      throw new Error('with-scenes: the AppDelegate no longer starts React Native the way the template did — update the plugin')
    }
    s = s.replace(ARRANQUE, `    ${MARCA} React Native starts in SceneDelegate, once the scene has a window.\n`)
    c.modResults.contents = s + ESCENA
    return c
  })
}
