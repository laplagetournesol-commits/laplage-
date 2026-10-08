/**
 * LE CYCLE DE VIE PAR SCÈNES iOS, POSÉ PAR PLUGIN ET NON À LA MAIN (08/10/2026).
 *
 * Compilée avec Xcode 27, une application qui crée sa fenêtre dans le délégué d'application est
 * ARRÊTÉE AU LANCEMENT par iOS 27 (`_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`).
 * Vécu le 08/10/2026 sur CasaFix (build 50) ; le délégué de scène écrit ce jour-là pour Joya
 * Éducation est repris ici : fenêtre créée depuis la scène, évènements rendus
 * au délégué d'application, liens d'ouverture reconstruits, et le filet qui démarre React Native
 * hors écran quand l'appli est réveillée sans scène.
 *
 * Même raison que les autres plugins : `npm run prebuild` réécrit ios/. Une retouche à la main de AppDelegate.swift disparaîtrait sans
 * erreur visible, et l'appli planterait à l'ouverture au build suivant.
 *
 * Le jour où Expo fournit `ExpoAppSceneDelegate` dans notre version (58) : supprimer ce plugin et
 * suivre https://github.com/expo/fyi/blob/main/ios-scene-lifecycle.md.
 */
const { withAppDelegate, withInfoPlist } = require('@expo/config-plugins');

const ANCIEN_DEMARRAGE = /#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\(\n\s*withModuleName: "main",\n\s*in: window,\n\s*launchOptions: launchOptions\)\n#endif\n\n/;
const DEMARRAGE = "    // ═══ LA FENÊTRE N'EST PLUS CRÉÉE ICI (08/10/2026, iOS 27) ═══════════════════════════════\n    //\n    // Compilée avec Xcode 27, une application qui crée sa fenêtre dans le délégué d'application\n    // est ARRÊTÉE AU LANCEMENT par iOS 27 (`EXC_BREAKPOINT` dans\n    // `_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`, vécu le 08/10/2026 sur Joya Éducation et CasaFix).\n    // Apple exige le « cycle de vie par scènes » : c'est `SceneDelegate`, en bas de ce fichier,\n    // qui crée la fenêtre et y démarre React Native.\n    //\n    // ⚠️ MAIS L'APPLI PEUT ÊTRE LANCÉE SANS ÉCRAN — réveil silencieux, tâche de fond — et dans\n    // ce cas iOS peut ne connecter AUCUNE scène. Sans fenêtre, React Native ne démarrerait pas,\n    // et aucune tâche de fond en JavaScript ne tournerait : le défaut serait\n    // invisible à l'ouverture et total en arrière-plan. D'où le filet ci-dessous : si aucune\n    // scène ne s'est présentée une seconde après le lancement, on démarre dans une fenêtre\n    // hors écran, comme avant. La scène, quand elle arrive, reprend cette interface.\n    optionsDeLancement = launchOptions\n    DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { [weak self] in\n      self?.demarrerSansScene()\n    }\n\n";
const MEMBRES = "  /// React Native a-t-il déjà été démarré ? Il ne doit l'être qu'UNE fois, par la scène ou par le\n  /// filet — jamais les deux.\n  private(set) var reactNativeDemarre = false\n  private var optionsDeLancement: [UIApplication.LaunchOptionsKey: Any]?\n\n  /// Démarre React Native dans `fenetre`. Rend `false` s'il tournait déjà.\n  @discardableResult\n  func demarrerReactNative(\n    dans fenetre: UIWindow, options: [UIApplication.LaunchOptionsKey: Any]?\n  ) -> Bool {\n    guard !reactNativeDemarre, let factory = reactNativeFactory else { return false }\n    reactNativeDemarre = true\n    window = fenetre\n    factory.startReactNative(withModuleName: \"main\", in: fenetre, launchOptions: options)\n    return true\n  }\n\n  /// LE FILET : lancement sans écran, aucune scène connectée. Voir le commentaire plus haut.\n  private func demarrerSansScene() {\n    guard !reactNativeDemarre else { return }\n    NSLog(\"[Scènes] lancement sans scène : React Native démarre hors écran\")\n    demarrerReactNative(dans: UIWindow(frame: UIScreen.main.bounds), options: optionsDeLancement)\n  }\n\n";
const DELEGUE_DE_SCENE = "// ═══ LE DÉLÉGUÉ DE SCÈNE (08/10/2026) — exigé par iOS 27 pour tout build fait avec Xcode 27 ═══\n//\n// Porté de `ExpoAppSceneDelegate` (Expo 57.0.27, expo/ios/AppDelegates), que notre version d'Expo\n// n'a pas. Le jour où Expo passe en 58, ce délégué est fourni : supprimer\n// cette classe et suivre https://github.com/expo/fyi/blob/main/ios-scene-lifecycle.md.\n//\n// Il fait trois choses, et aucune n'est décorative :\n//   1. créer la fenêtre DEPUIS LA SCÈNE et y démarrer React Native — déclarer la scène dans\n//      l'Info.plist sans ça supprime le plantage et laisse un écran noir ;\n//   2. rendre au délégué d'application les évènements qu'iOS ne lui envoie plus sous ce régime\n//      (premier plan, arrière-plan, liens) : les modules Expo s'y abonnent par lui ;\n//   3. reprendre l'interface déjà démarrée hors écran quand l'appli a été lancée sans scène.\nclass SceneDelegate: UIResponder, UIWindowSceneDelegate {\n  var window: UIWindow?\n\n  private var delegue: AppDelegate? { UIApplication.shared.delegate as? AppDelegate }\n\n  func scene(\n    _ scene: UIScene,\n    willConnectTo session: UISceneSession,\n    options connectionOptions: UIScene.ConnectionOptions\n  ) {\n    guard let windowScene = scene as? UIWindowScene, let delegue else { return }\n    let fenetre = UIWindow(windowScene: windowScene)\n    window = fenetre\n\n    if delegue.reactNativeDemarre {\n      // L'appli tournait déjà hors écran (lancée sans scène) : on déplace son interface dans la\n      // fenêtre de la scène, on ne redémarre rien.\n      let ancienne = delegue.window\n      let racine = ancienne?.rootViewController\n      ancienne?.rootViewController = nil\n      ancienne?.isHidden = true\n      fenetre.rootViewController = racine\n      fenetre.makeKeyAndVisible()\n      delegue.window = fenetre\n      NSLog(\"[Scènes] scène connectée : interface déjà démarrée hors écran, reprise\")\n    } else {\n      // Sous ce régime, un lien qui LANCE l'application arrive dans `connectionOptions`, plus\n      // dans les options de lancement — où `Linking.getInitialURL()` continue pourtant de le\n      // chercher. On les reconstruit, sinon ce lien n'est livré à personne.\n      let activiteWeb = connectionOptions.userActivities.first {\n        $0.activityType == NSUserActivityTypeBrowsingWeb\n      }\n      delegue.demarrerReactNative(\n        dans: fenetre,\n        options: Self.optionsDeLancement(\n          url: connectionOptions.urlContexts.first?.url, activite: activiteWeb))\n      NSLog(\"[Scènes] scène connectée : React Native démarre dans la fenêtre de la scène\")\n    }\n\n    connectionOptions.urlContexts.forEach { ouvrir($0) }\n    connectionOptions.userActivities.forEach { continuer($0) }\n  }\n\n  func sceneDidDisconnect(_ scene: UIScene) {\n    // On garde la fenêtre côté délégué d'application : React Native continue de tourner pour\n    // les tâches de fond, et une scène qui revient reprendra son interface.\n    window = nil\n  }\n\n  func sceneDidBecomeActive(_ scene: UIScene) {\n    delegue?.applicationDidBecomeActive(UIApplication.shared)\n  }\n\n  func sceneWillResignActive(_ scene: UIScene) {\n    delegue?.applicationWillResignActive(UIApplication.shared)\n  }\n\n  func sceneWillEnterForeground(_ scene: UIScene) {\n    delegue?.applicationWillEnterForeground(UIApplication.shared)\n  }\n\n  func sceneDidEnterBackground(_ scene: UIScene) {\n    delegue?.applicationDidEnterBackground(UIApplication.shared)\n  }\n\n  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {\n    URLContexts.forEach { ouvrir($0) }\n  }\n\n  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {\n    continuer(userActivity)\n  }\n\n  // ⚠️ ON PASSE PAR LE DÉLÉGUÉ D'APPLICATION, ET PAR LUI SEUL. Ses deux surcharges (« Linking\n  // API » et « Universal Links », plus haut) préviennent déjà `RCTLinkingManager` : l'appeler\n  // ici aussi livrerait chaque lien deux fois à l'application.\n  private func ouvrir(_ contexte: UIOpenURLContext) {\n    var options: [UIApplication.OpenURLOptionsKey: Any] = [.openInPlace: contexte.options.openInPlace]\n    if let source = contexte.options.sourceApplication { options[.sourceApplication] = source }\n    if let annotation = contexte.options.annotation { options[.annotation] = annotation }\n    _ = delegue?.application(UIApplication.shared, open: contexte.url, options: options)\n  }\n\n  private func continuer(_ activite: NSUserActivity) {\n    _ = delegue?.application(UIApplication.shared, continue: activite, restorationHandler: { _ in })\n  }\n\n  /// Les options de lancement telles que React Native les lit, reconstruites depuis la scène.\n  /// Les clés sont écrites par leur nom : les accesseurs `UIApplication` sont dépréciés depuis\n  /// iOS 26, mais `getInitialURL` lit toujours ces clés-là.\n  private static func optionsDeLancement(\n    url: URL?, activite: NSUserActivity?\n  ) -> [UIApplication.LaunchOptionsKey: Any]? {\n    var options: [UIApplication.LaunchOptionsKey: Any] = [:]\n    if let url {\n      options[UIApplication.LaunchOptionsKey(rawValue: \"UIApplicationLaunchOptionsURLKey\")] = url\n    }\n    if let activite {\n      options[UIApplication.LaunchOptionsKey(\n        rawValue: \"UIApplicationLaunchOptionsUserActivityDictionaryKey\")] = [\n          \"UIApplicationLaunchOptionsUserActivityTypeKey\": activite.activityType,\n          \"UIApplicationLaunchOptionsUserActivityKey\": activite\n        ]\n    }\n    return options.isEmpty ? nil : options\n  }\n}\n";

/** Transforme le AppDelegate.swift du modèle Expo. Rend le texte inchangé s'il est déjà à jour. */
function poserLesScenes(contenu) {
  if (contenu.includes('class SceneDelegate')) return contenu;
  if (!ANCIEN_DEMARRAGE.test(contenu) || !contenu.includes('  // Linking API\n')) {
    throw new Error("scenes-ios : le AppDelegate.swift généré par Expo n'a plus la forme attendue. "
      + "Sans ce plugin l'appli plante à l'ouverture sur iOS 27 : adapter plugins/scenes-ios.js.");
  }
  return contenu
    .replace(ANCIEN_DEMARRAGE, DEMARRAGE)
    .replace('  // Linking API\n', MEMBRES + '  // Linking API\n')
    .replace(/\s*$/, '\n\n' + DELEGUE_DE_SCENE);
}

const MANIFESTE_DE_SCENE = {
  UIApplicationSupportsMultipleScenes: false,
  UISceneConfigurations: {
    UIWindowSceneSessionRoleApplication: [
      {
        UISceneConfigurationName: 'Default Configuration',
        UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
      },
    ],
  },
};

module.exports = function withScenesIOS(config) {
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = MANIFESTE_DE_SCENE;
    return cfg;
  });
  return withAppDelegate(config, (cfg) => {
    cfg.modResults.contents = poserLesScenes(cfg.modResults.contents);
    return cfg;
  });
};
module.exports.poserLesScenes = poserLesScenes;
module.exports.MANIFESTE_DE_SCENE = MANIFESTE_DE_SCENE;
