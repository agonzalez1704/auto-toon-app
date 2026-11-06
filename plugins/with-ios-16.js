/**
 * iOS 16.4 everywhere, so the app builds with Xcode 27 (2026-11-05): Expo SDK 55's modules (expo-router) call
 * iOS 16 APIs, and Xcode 27 refuses pod targets below iOS 15 (SDWebImage still declares 9.0). The app target,
 * the Podfile's platform and every pod are lifted to the same minimum. `ios/` is generated (expo prebuild):
 * this is the only place the setting lives.
 */
const { withDangerousMod, withPodfileProperties, withXcodeProject } = require('expo/config-plugins')
const fs = require('fs')
const path = require('path')

const MINIMO = '16.4'
const MARCA = '# with-ios-16: every pod at the app minimum'

module.exports = function withIos16(config) {
  config = withPodfileProperties(config, (c) => {
    c.modResults['ios.deploymentTarget'] = MINIMO
    return c
  })
  config = withXcodeProject(config, (c) => {
    const configs = c.modResults.pbxXCBuildConfigurationSection()
    for (const k of Object.keys(configs)) {
      const ajustes = configs[k].buildSettings
      if (ajustes && ajustes.IPHONEOS_DEPLOYMENT_TARGET) ajustes.IPHONEOS_DEPLOYMENT_TARGET = MINIMO
    }
    return c
  })
  return withDangerousMod(config, [
    'ios',
    (c) => {
      const podfile = path.join(c.modRequest.platformProjectRoot, 'Podfile')
      let s = fs.readFileSync(podfile, 'utf8')
      if (!s.includes(MARCA)) {
        s = s.replace(
          /(post_install do \|installer\|\n)/,
          `$1    ${MARCA}\n    installer.pods_project.targets.each do |t|\n      t.build_configurations.each do |bc|\n        bc.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${MINIMO}' if bc.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < ${MINIMO}\n      end\n    end\n`,
        )
        fs.writeFileSync(podfile, s)
      }
      return c
    },
  ])
}
