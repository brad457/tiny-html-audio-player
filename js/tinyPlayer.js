/**
 * tiny-player v.0.1.0
 * irubataru.com
 *
 * Copyright (c) 2018 Jonas Rylund Glesaaen
 *
 * MIT License
 */

(function() {

  "use strict"

  $(document).ready(function() {
    var player = irubataru.tinyPlayer.createPlayerFromTags();
  });

  /**
   * Encapsulating namespace for tinyPlayer
   * @namespace
   */
  var irubataru = {
    tinyPlayer: {
      /**
       * Main player object that manages the audio players on the webpage.
       * @type
       */
      Player: class {

        /**
         * Constructs a player object from a list of audio elements.
         * @constructor
         *
         * @param {Array} playlist
         *   List of songs to attach to the player
         */
        constructor(playlist) {
          this._playlist = playlist;
          this._index = 0;
          this._mouse_down = false;
          this.ns = irubataru.tinyPlayer;
        }

        /**
         * Play the specific song from the playlist
         *
         * @param {number} index
         *   The item to play, currently selected if none is provided
         */
        play(index) {
          var self = this;

          index = typeof index === 'number' ? index : self._index;
          var sound = self._playlist[index].howl;

          // Begin playing the sound.
          sound.play();

          // Keep track of the index we are currently playing.
          self._index = index;
        }

        /**
         * Pause a song from the Player
         *
         * @param {number} index
         *   The item to pause, currently selected if none is provided
         */
        pause(index) {
          var self = this;

          index = typeof index === 'number' ? index : self._index;
          var sound = self._playlist[index].howl;

          // Pause the sound.
          if (sound) {
            sound.pause();
          }
        }

        /**
         * Stop a song from the Player
         *
         * @param {number} index
         *   The item to stop, currently selected if none is provided
         */
        stop(index) {
          var self = this;

          index = typeof index === 'number' ? index : self._index;
          var sound = self._playlist[index].howl;

          // Begin playing the sound.
          sound.stop();

          // Keep track of the index we are currently playing.
          self._index = index;
        }

        /**
         * Switch to song in index, stopping other songs currently playing, and
         * pausing current if index == current.
         *
         * @param {number} index
         *   The item to toggle to
         */
        toggleTo(index) {
          var self = this;
          var sound = self._playlist[self._index].howl;

          // Stop current track or pause it if switching to the same
          if (sound.playing()) {
            if (index === self._index) {
              self.pause();
              return;
            } else {
              sound.stop();
            }
          }

          // Play the new track.
          self.play(index);
        }

        /**
         * Set the volume of the Player, updating the volume slider of every
         * player on the page.
         *
         * @param {number} val
         *   The value of the volume, in the range [0, 100].
         */
        volume(val) {
          var self = this;

          // Update the global volume (affecting all Howls).
          Howler.volume(val);

          var barWidth = (val * 60) / 100;
          self._playlist.forEach(function(song) {
            song.html_elem.find(".song-volume-bar#fg").css("width", (val * 60) + "%");
            song.html_elem.find(".song-volume-dot").css("left", (val * 60 + 20) + "%");
          });

          //sliderBtn.style.left = (window.innerWidth * barWidth + window.innerWidth * 0.05 - 25) + 'px';
        }

        /**
         * Update the player visuals to reflect the current position in the
         * current song.
         */
        step() {
          var self = this;
          var ns = this.ns;

          // Get the Howl we want to manipulate.
          var sound = self._playlist[self._index].howl;
          var html_elem = self._playlist[self._index].html_elem;

          // Determine our current seek position.
          var seek = sound.seek() || 0;
          html_elem.find(".song-timer").html(ns._formatTime(seek) + " / " +
            ns._formatTime(sound.duration()));

          html_elem.find(".song-progress").css("width", (((seek / sound.duration())) *
            100 || 0) + "%");

          // If the sound is still playing, continue stepping.
          if (sound.playing()) {
            requestAnimationFrame(self.step.bind(self));
          }
        }
      },

      /**
       * Create a new Player by scanning the document for audio.simple-audio
       * elements.
       *
       * @return {Player} Constructed Player object.
       */
      createPlayerFromTags: function() {
        var ns = this;
        var playlist = [];

        // Loop over every audio tag
        $("audio.iru-tiny-player").each(function() {

          let title = "";
          // Prioritise the data-title tag, if not look for the last header before
          // we hit the previous audio element.
          if ($(this).attr("data-title")) {
            title = $(this).attr("data-title");
          } else {
            title = $(this).prevUntil("audio", ":header").first().html();
          }

          let files = [];

          $(this).children("source").each(function() {
            files.push($(this).attr("src"));
          });

          var song_elem = ns.createSongPlayer(title);

          playlist.push({
            title: title,
            files: files,
            html_elem: song_elem,
            howl: null
          });

          $(this).after(song_elem);
          $(this).hide();
        });
      
        var player = new ns.Player(playlist);

        ns._setupEvents(player);

        return player;
      },

      /**
       * Create a jQuery object with the tinyPlayer HTML
       * @return {jquery} Constructed player object
       */
      createSongPlayer: function(title) {
        return $("<div>")
          .addClass("iru-tiny-player")
          .append($("<div>").addClass("song-progress"))
          .append(
            $("<div>").html(title).addClass("song")
            .prepend($('<div class="icon fa-stop">'))
            .prepend($('<div class="icon fa-play">'))
            .prepend($('<div class="icon fa-pause">').hide()))
          .append($("<div>").addClass("song-info")
            .append($('<div>').addClass("song-timer"))
            .append($('<div class="icon fa-volume-up">')))
          .append($("<div>").addClass("song-volume-control").hide()
            .append($("<div>").addClass("song-volume-bar").attr("id", "bg"))
            .append($("<div>").addClass("song-volume-bar").attr("id", "fg"))
            .append($("<div>").addClass("song-volume-bar").attr("id", "fgg"))
            .append($("<div>").addClass("song-volume-dot"))
            .append($("<div>").addClass("icon fa-times")));
      },

      /**
       * Adds all the events to the player object
       * @param {Player} player
       *   The player object to manipulate
       */
      _setupEvents: function(player) {
        var ns = this;
        var song_index = 0;

        player._playlist.forEach(function(song) {
          var song_elem = song.html_elem;
          var this_idx = song_index;

          song.howl = ns._createHowlForPlayer(player, song);
          ns._bindPlayerControls(player, song_elem, this_idx);

          ++song_index;
        });
      },

      /**
       * Initialise the Howl element
       * @param {Player} player
       *   The reference player object that will own the Howl
       * @param {jquery} song
       *   The HTML song object that references the constructed audio
       * @return {Howl}
       *   The constructed Howl
       */
      _createHowlForPlayer: function(player, song) {

        var song_elem = song.html_elem;
        var ns = this;

        return new Howl({
            src: song.files,
            html5: true, // Force to HTML5 so that the audio can stream in (best for large files).
            onplay: function() {
              song_elem.find(".fa-play").hide();
              song_elem.find(".fa-pause").show();

              // Start upating the progress of the track.
              requestAnimationFrame(player.step.bind(player));
            },
            onload: function() {
              var self = this;
              song_elem.find(".song-timer").html(ns._formatTime(
                self.duration()));
            },
            onend: function() {
              var self = this;
              song_elem.find(".song-timer").html(ns._formatTime(
                self.duration()));
              song_elem.find(".song-progress").css("width", "0%");

              song_elem.find(".fa-pause").hide();
              song_elem.find(".fa-play").show();
            },
            onpause: function() {
              var self = this;
              song_elem.find(".fa-pause").hide();
              song_elem.find(".fa-play").show();
            },
            onstop: function() {
              var self = this;
              song_elem.find(".song-timer").html(ns._formatTime(
                self.duration()));
              song_elem.find(".song-progress").css("width", "0%");

              song_elem.find(".fa-pause").hide();
              song_elem.find(".fa-play").show();
            }
        });
      },

      /**
       * Bind events to the HTML player object
       * @param {Player} player
       *   Target Player object
       * @param {jquery} elem
       *   The HTML element we want to add the events to
       * @param {number} idx
       *   Index of element in the Player playlist
       */
      _bindPlayerControls: function(player, elem, idx) {
        // Bind the play button
        elem.find(".fa-play").click(function() {
          player.toggleTo(idx);
        });

        // Bind the pause button
        elem.find(".fa-pause").click(function() {
          player.pause(idx);
        });

        // Bind the stop button
        elem.find(".fa-stop").click(function() {
          player.stop(idx);
        });

        // Show the volume control
        elem.find(".fa-volume-up").click(function() {
          elem.find(".song-volume-control").show();
        });

        // Hide the volume control
        elem.find(".fa-times").click(function() {
          elem.find(".song-volume-control").hide();
        });

        // Choose sound level by clicking the volume bar
        elem.find(".song-volume-bar#fgg").click(function(event) {
          var x = event.pageX;
          x = x - elem.find(".song-volume-bar#bg").offset().left - 7.5;
          var width = parseFloat(elem.find(".song-volume-bar#bg").innerWidth());
          var per = x / width;

          player.volume(per);
        });

        // Click start the volume dot
        elem.find(".song-volume-dot").mousedown(function(){
          player._mouse_down = true;
        });

        // Click end the volume dot
        elem.find(".song-volume-control").mouseup(function(){
          player._mouse_down = false;
        });

        // Update sound level as you move the sound dot
        elem.find(".song-volume-control").mousemove(function(event) {
          if (player._mouse_down) {
            var x = event.pageX;
            x = x - elem.find(".song-volume-bar#bg").offset().left - 7.5;

            var width = parseFloat(elem.find(".song-volume-bar#bg").innerWidth());
            var per = Math.min(1, Math.max(0, x / width));
            player.volume(per);
          }
        });
      },

      /**
       * Format time to a string
       * @param {number} secs
       *   Number of seconds 
       * @return {string}
       *   Input formatted as "[hours:]minutes:seconds"
       */
      _formatTime: function(secs){
        var hours = Math.floor(secs / 3600) || 0;
        var minutes = Math.floor((secs - hours * 3600) / 60) || 0;
        var seconds = Math.floor(secs - minutes * 60) || 0;

        if (hours > 0) {
          return hours + ":" + (minutes < 10 ? "0" : "") + minutes + ":" + (
            seconds < 10 ? "0" : "") + seconds;
        } else {
          return minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
        }
      }
    }
  };

  if (typeof exports === "object") {
    exports.Player = irubataru.tinyPlayer.Player;
    exports.createPlayerFromTags = irubataru.tinyPlayer.createPlayerFromTags;
    exports.createSongPlayer = irubataru.tinyPlayer.createSongPlayer;
  }

})();
