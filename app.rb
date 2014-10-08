require 'sinatra'
require 'sinatra-websocket'
require 'sinatra/activerecord'
require 'json'
require 'will_paginate'
require 'will_paginate/active_record'
require './config/environments'
require './models/gif'

set :server, 'thin'
set :sockets, []

configure do
  set :gifmachine_password, 'If you don\'t change this I\'m going to be mad at you'
  set :gifmachine_fallback_gif, 'http://media.tumblr.com/acf1f8fbbe9a937d5fd6ad4802648302/tumblr_inline_na61n7e6yw1raprkq.gif'
end

# websockets ftw
get '/' do
  if !request.websocket?
    send_file 'public/index.html'
  else
    request.websocket do |ws|
      ws.onopen do
        ws.send(get_most_recent_gif_json)
        settings.sockets << ws
      end
      ws.onclose do
        settings.sockets.delete(ws)
      end
    end
  end
end

# Get most recent gif's json
def get_most_recent_gif_json
  gif = Gif.last(1)
  if gif && gif.first
    {
        :type => 'gif',
        :url => gif.first[:url],
        :meme_top => gif.first[:meme_top],
        :meme_bottom => gif.first[:meme_bottom]
    }.to_json
  else
    {
        :type => 'gif',
        :url => settings.gifmachine_fallback_gif,
        :meme_top => 'welcome to',
        :meme_bottom => 'gifmachine'
    }.to_json
  end
end

# REST interface for gifs
get '/gif' do
  content_type :json
  get_most_recent_gif_json
end

# Save this to the db and update the websockets
post '/gif' do
  if params[:seekrit] == settings.gifmachine_password
    gif = Gif.new
    gif.url = params[:url]
    gif.who = params[:who]
    gif.when = Time.now
    gif.meme_top = params[:meme_top]
    gif.meme_bottom = params[:meme_bottom]

    if gif.save
      # Send the new gif to every connected client
      EM.next_tick { settings.sockets.each { |s| s.send(get_most_recent_gif_json) } }

      200
    else
      500
    end
  else
    403
  end
end

# Authenticated route to reload all connected clients' web browsers for code changes
post '/reload' do
  if params[:seekrit] == settings.gifmachine_password
    EM.next_tick { settings.sockets.each { |s| s.send({ :type => 'reload' }.to_json) } }
  else
    403
  end
end

# Simple history page
get '/history' do
  gifs = Gif.paginate(:page => params[:page], :per_page => 32).order('id DESC')
  erb :history, :layout => false, :locals => { :gifs => gifs, :page => params[:page], :query => nil }
end

# Simple search functionality
get '/search' do
  gifs = Gif.where('LOWER(who) LIKE :q OR LOWER(meme_top) LIKE :q OR LOWER(meme_bottom) LIKE :q', { q: "%#{params[:query].downcase}%" }).paginate(:page => params[:page], :per_page => 32).order('id DESC')
  erb :history, :layout => false, :locals => { :gifs => gifs, :page => params[:page], :query => params[:query] }
end

# For viewing a specific gif
get '/view/:id' do
  gif = Gif.find(params[:id])
  erb :view, :layout => false, :locals => { :gif => gif }
end