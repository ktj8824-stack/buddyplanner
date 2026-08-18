require 'xcodeproj'
project_path = 'ios/App/App.xcodeproj'
project = Xcodeproj::Project.open(project_path)
target = project.targets.find { |t| t.name == 'LiveExtension' }
if target
  target.remove_from_project
  project.save
  puts "Target LiveExtension removed."
else
  puts "Target LiveExtension not found."
end
