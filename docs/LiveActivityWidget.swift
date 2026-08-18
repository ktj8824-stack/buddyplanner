import WidgetKit
import SwiftUI
import ActivityKit

// MARK: - Live Activity Widget View (Lock Screen & Dynamic Island)
struct LiveActivityWidgetView: View {
    let context: ActivityViewContext<TimelineActivityAttributes>

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            // Header Row
            HStack {
                HStack(spacing: 6) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 5)
                            .fill(LinearGradient(colors: [Color(red: 0.83, green: 0.68, blue: 0.21), Color(red: 0.66, green: 0.48, blue: 0.06)], startPoint: .topLeading, endPoint: .bottomTrailing))
                            .frame(width: 20, height: 20)
                        Text("B")
                            .font(.system(size: 11, weight: .black))
                            .foregroundColor(.black)
                    }
                    Text("buddyplanner")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(Color(red: 0.9, green: 0.9, blue: 0.92))
                }
                Spacer()
                Text("타임라인 ✕")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(Color(red: 0.55, green: 0.55, blue: 0.58))
            }

            // Body Row
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("\(context.state.timeStr) \(context.state.title)")
                        .font(.system(size: 18, weight: .extrabold))
                        .foregroundColor(.white)
                    Text(context.state.subtitle)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(Color(red: 0.6, green: 0.6, blue: 0.63))
                }
                Spacer()
                Text(context.state.iconEmoji)
                    .font(.system(size: 38))
            }

            // Bottom Progress Bar Row
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 2)
                        .fill(Color.white.opacity(0.15))
                        .frame(height: 4)
                    RoundedRectangle(cornerRadius: 2)
                        .fill(Color(red: 0.2, green: 0.78, blue: 0.35))
                        .frame(width: geo.size.width * CGFloat(min(1.0, max(0.05, context.state.progress))), height: 4)
                }
            }
            .frame(height: 4)
        }
        .padding(16)
        .background(Color(red: 0.11, green: 0.11, blue: 0.12))
    }
}

// MARK: - Widget Bundle & Activity Configuration
@main
struct LiveActivityWidgetBundle: WidgetBundle {
    var body: some Widget {
        TimelineLiveActivityWidget()
    }
}

struct TimelineLiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: TimelineActivityAttributes.self) { context in
            // Lock Screen UI (잠금화면 카드 뷰)
            LiveActivityWidgetView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                // Dynamic Island Expanded UI (다이나믹 아일랜드 펼쳤을 때)
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 4) {
                        Text(context.state.iconEmoji)
                        Text(context.state.title)
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.state.timeStr)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.green)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(context.state.subtitle)
                        .font(.system(size: 12))
                        .foregroundColor(.gray)
                }
            } compactLeading: {
                Text(context.state.iconEmoji)
            } compactTrailing: {
                Text(context.state.timeStr)
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.green)
            } minimal: {
                Text(context.state.iconEmoji)
            }
        }
    }
}
