configure :development, :production do
  db = YAML.load(File.read('./config/database.yml'))[ENV['RACK_ENV']]

  ActiveRecord::Base.establish_connection(
      :adapter => db['adapter'],
      :host => db['host'],
      :username => db['username'],
      :password => db['password'],
      :database => db['database'],
      :encoding => 'utf8'
  )
end