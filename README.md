# Scenes Control
Scenes Control File Format

This Idea is about creating new file standard, which could be adopted by video/audio players.
This File contains Scenes notation information about the video/audio which is going to be played.

This way consume content by users, will be adoubt user preferences, For example user can watch movie and skip,blure or mute violence scenes, and keep other part of content the same.


## Play Demo

https://scenescontrol.netlify.app/


<a src='https://scenescontrol.netlify.app/#/aHR0cHM6Ly9naXRodWIuY29tL0FsaS1BbHp5b3VkL1NjZW5lc0NvbnRyb2wvcmF3L21haW4vc3JjL2Fzc2V0cy9zYW1wbGUud2VibQ==/aHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL0FsaS1BbHp5b3VkL1NjZW5lc0NvbnRyb2wvbWFpbi9zcmMvYXNzZXRzL3NhbXBsZS5zcnQ=/aHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL0FsaS1BbHp5b3VkL1NjZW5lc0NvbnRyb2wvbWFpbi9zcmMvYXNzZXRzL2ZpbHRlci50eHQ='>
Demo_With_URL_Params
</a>
<br/>

```
DemoURL/#/Param1/Param2/Param3

Param1: VideoURLBase64
Param2: SubtitleURLBase64
Param3: FilterURLBase64
```
<br/>
<br/>

Hit **Play** button, and watch the clip and notice how it will handle profanity and violance scenes.

Notes:

- Video file itself is not edited and keept as is, but video player is configured with scene guide file.

- You can use the demo to edit scene guide file, or change behaviour for each scene type.


## Common Questions:
### What does it do ?

Let’s say you are watching a movie in your device
This file will contains description about scenes parent guide. Like:

- Category                      : Violence, Nudity, Sex, Profanity, etc.
- intensity                     : Intense level (Hight,  LOW) scale.
- Suggested behavior            : Blur, Skip, Mute, .. etc.


### Why do I need it ?

Examples :

- Make watching movies more comfortably, because it will respect user preferences, for example  skip uncomfortable senses types. 
- You like the movie but you do want to see gore/violence senses.
- Content provider, will provide one movie, with this file format, instead of shipping multiple version of the movies. (uncut version and original version).

### How to use it?

As simple as setting subtitle for the movie.

Example:

- Open Movie with VLC 
- Select Parent Guided file
- Specify in the option (Age restriction, Avoid scenes types)
- Play the move, and all unwanted scenes will be avoided while playing.

### How these files are created ?

These files will be created with multiple ways:

- Contribution from people, by creating these files for movies they watched. (Like what has be done with subtitle for years)



### What we are going to do next ?

- We will try to create simple POC, to show the Idea in real world example.
- Building utility to generate parent guided files. (this way we can start contributing to community)
- More diagnosis and research to build file format specification, which will allow future expansion, and simple adoption by video/audio players.
- Reach community such as VLC to adopt this feature, and do contribute there to implement it.


### Expectations:

- We hope that we could build community for such feature, which is very helpful for most of us (let me know your Idea).
- This will become a standard in most video/audio players.