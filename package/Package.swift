// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "TeamLepisodeCapacitorKakaoLogin",
    platforms: [.iOS(.v13)],
    products: [
        .library(
            name: "TeamLepisodeCapacitorKakaoLogin",
            targets: ["CapacitorKakaoLoginPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", branch: "main"),
        .package(url: "https://github.com/kakao/kakao-ios-sdk", .upToNextMajor(from: "2.23.0"))
    ],
    targets: [
        .target(
            name: "CapacitorKakaoLoginPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "KakaoSDK", package:"kakao-ios-sdk")
            ],
            path: "ios/Sources/CapacitorKakaoLoginPlugin"),
        .testTarget(
            name: "CapacitorKakaoLoginPluginTests",
            dependencies: ["CapacitorKakaoLoginPlugin"],
            path: "ios/Tests/CapacitorKakaoLoginPluginTests")
    ]
)
