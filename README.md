# The Big Web Quiz

This exists on:

- Github https://github.com/GoogleChromeLabs/big-web-quiz
- Glitch https://glitch.com/edit/#!/bwq

## What's this all about?

At Chrome Dev Summit in 2019 we polled the audience to discover their favourite web feature of 2019 TODO-add-video-link. Here's the stuff we (hastily) built to make it all happen. You can use it to run your own live polls, present slides, and run contests.

**Glitch limits projects to 4000 requests per hour** which will limit the number of people you can have taking part to around 200-500. If you need more, you'll need to set up your own server.

## Getting started on Glitch

First, remix [this project](https://glitch.com/edit/#!/bwq) to create your own copy, and fill in the following in your project's `.env` file:

- `ADMIN_PASSWORD` - This is the password you'll use to access the admin panel. Make this something difficult to guess, and don't like, write it on your forehead.
- `COOKIE_SECRET` - Make this something unique. You don't need to remember it, so a quick mash of the keyboard is enough.

For example:

```sh
ADMIN_PASSWORD=useSomethingDifferent
COOKIE_SECRET=wociamssjcn9834gkj
```

But yeah, **don't just copy the above**. If you want things to be more secure, you can use Google for logins. More on that later…

Once you've done the above, the project should build successfully, and you're ready to go!

## URLs

- `/big-screen/` - This is the page you'll display for everyone to see. I recommend clicking somewhere on this page before presenting, as this will allow sound to play. You don't need the sound, but the sound is _cool_ and synchronising it took me _effort_ so please don't _miss out on that_.
- `/admin/` - This is how you'll control things. Remember how I said this was built hastily? Well, once you see the design of this page you'll see where all the haste was spent.
- `/` - This is the page folks will use to vote.

## Creating a vote

1. From `/admin/`, go to the "Active vote" section and click "New vote".
1. Click "Edit" and enter labels for each. This is the label that'll appear to the players and on the big screen.
1. Ponder briefly at what "Champion" means, then skip over it (it's optional, we'll cover to it later).
1. Click 'save'.

And with that, you've created your first vote! No, nothing happens yet. To make stuff happen you need to change the "State":

- `Staging` - The vote appears in the admin page, but it doesn't appear on the big screen, or to users.
- `Introducing` - The vote labels appear on the big screen, but voting hasn't started yet.
- `Voting` - Users can now vote. The big screen shows the live results.
- `Results` - Users can no longer vote. The big screen shows the final results.
- `Clear vote` - Remove the vote. It's removed from the big screen and admin page.

Cookies are used to 'prevent' folks from voting multiple times. 'Prevent' is in quotes because it's pretty ineffective. Folks can just use multiple browsers, profiles, or voting bots to get around it. If you want extra protection, you'll need to make users log in. More on that later.

_But first,_ more fun stuff:

## Champions

'Champions' are people (or teams, or I dunno, maybe other things). In the "Champions" section of `/admin/` you can add/edit champions. Avatars don't need to be bigger than 270x270, but larger/smaller won't break anything. Non-square avatars might break layout. I dunno. Did I mention this was built hastily?

Of course, the best place to upload avatars is Glitch's 'assets' CDN.

Once you have champions, you can assign them to votes. This means they'll be displayed on the big screen while a vote is happening, and that's it really.

You can also give champions a score. You can display scores on the big screen by changing the "Presentation state" on the `/admin/` page to "Champion scores".

Champions aren't automatically awarded points for 'winning' votes. Scoring is entirely manual and independent from everything else. But this means you can award points however you want. Maybe give double points to a champion if it's their birthday? Maybe secretly dock points from someone you hate? It's up to you.

## Presenting iframes

Do you want to display the contents of another page on the big screen? No? Well stop reading this section. For everyone else:

In the "Present iframe" section of `/admin/`, click "Edit", enter a URL, then click "save". It'll now be displayed on the big screen. Click "clear" to get rid of it.

And that's it! No, wait, that's not it…

### Iframe actions

If you want to be really smart, your iframe can expose 'actions' using [Comlink](https://github.com/GoogleChromeLabs/comlink).

[Here's an example you can remix](https://glitch.com/edit/#!/bwq-iframe-example?path=script.js). Edit the object passed to `init`. The keys are labels, and the values are functions to call.

Give it a try by showing `https://bwq-iframe-example.glitch.me/` as an iframe. The admin page will now offer the actions "Go red", "Go green", "Go blue", which you can click to run the functions. This is what we used at Chrome Dev Summit to advance the slides as we were talking about features.

## Creating a sports bracket

First, create some topics that'll be part of the bracket:

1. From `/admin/`, go to "Edit topics".
1. "Add"
1. Give it a name, and optionally a champion and "Slides URL". You can easily change these later so don't worry too much about it. "Slides URL" just makes it easier to display this URL as an iframe later.
1. Add more, then click 'Save'.

Back on `/admin/` in the "Bracket" section, click "Regenerate bracket".

The bracket can have any number of items, but we optimised it for 16 items (8 and 32 work pretty well too). The current CSS might not quite work for other numbers, but feel free to go in and edit the CSS!

## Displaying & editing the bracket

From `/admin/` you can set the "Presentation state" to "Results bracket", which will display the bracket on the big screen.

See those `...` buttons in the "Bracket" section of `/admin/`? Tap those to select that area of the bracket. That'll populate the "Selected bracket" section of `/admin/`.

Clicking "Zoom here" will zoom the big screen into that section of the bracket. Click "Zoom out" in the "Bracket" section if you want to zoom back out.

You can use the "Selected bracket" section to assign a topic. Then, you'll be able to change its champion, and show its iframe if it has one.

Clicking "create vote" will populate the "Active vote" section with these two items.

Clicking "Set as winner" will make this item the winner of this stage. You can change the winner later if you want.

## Better logins

If you want, you can use Google Sign-In for admins and even regular users. This is more secure for admins, but it also prevents most vote cheating, as each vote is tied to a Google login. Of course, if someone has 100 Google logins, they can still vote 100 times, but meh, well done them.

By the way, if you're a government agent and you're thinking of using this system for an election, please stop now. Stop everything. Go away.

To set up a Google Sign-in project:

1. Click the "Configure a project" button on [this page](https://developers.google.com/identity/sign-in/web/sign-in).
1. Create a new project and give it a name.
1. For "where are you calling from", pick "Web server".
1. For "Authorized redirect URIs", enter your Glitch project domain followed by `/auth/oauth2callback`. So, if your Glitch domain is `https://bwq.glitch.me`, you'd enter `https://bwq.glitch.me/auth/oauth2callback`.
1. Save the "Client ID" and "Client Secret".

Then in your project's `.env` file add:

```sh
OAUTH_CLIENT=client_id_goes_here
OAUTH_SECRET=client_secret_goes_here
```

Of course, replace the above values with your "Client ID" and "Client Secret".

Then, over in `./server/config.ts`:

1. Set `useGoogleLogin` to true.
1. Set `requirePlayerLogin` to true if you want to require voters to log in.
1. Set `admins` to an array of email addresses of admins.

Done!

## Other config

## Environment variables

- `ADMIN_PASSWORD` - If `useGoogleLogin` is false, this is the password for the admin panel.
- `OAUTH_CLIENT` - For Google logins. See above.
- `OAUTH_SECRET` - For Google logins. See above.
- `COOKIE_SECRET` - A random string to improve cookie security.
- `COOKIE_DOMAIN` - The domain for the cookie. It's useful if you want the cookie to apply to subdomains. You shouldn't need this when using Glitch.
- `WEB_SOCKET_ORIGIN` - Optional origin to use for web sockets. Defaults to the same origin.
- `PORT` - Server port number. Again, you probably don't need to change this.
- `ORIGIN` - This is usually autodetected, but you can set it if autodetection doesn't do the right thing. It works fine on Glitch.
- `STORAGE_ROOT` - Where to store persistant data. Defaults to `./.data`, which is the correct value for Glitch.

## Config in JS files

`./config.js`

- `title` - The main site title.
- `subTitle` - Um, the site sub title.

Anything exported from this will be available via `import val from 'consts:propery-name-here';`.

`./shared/state.ts`

- `palette` - The gradients available to the app.
- `presetIframes` - This populates the admin panel with shortcuts to display particular iframes.

`./server/config.ts`

- `useGoogleLogin` - Enable using Google logins.
- `requireLogin` - Should users have to log in with Google in order to vote?
- `admins` - Who can log in to the admin bits when Google login is enabled.

## I wish this app did things differently!

Change it! Like I said, this was built in a hurry, so there's code in there I'm not proud of, but feel free to dig in and change stuff! That's the beauty of Glitch.
