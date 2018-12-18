function MyListItem(commentsPostUrl, teams) {
    this.listElement = null;
    this.commentsPostUrl = commentsPostUrl;
    this.teams = teams;
    this.streamPostUrl = null;
}

// Remove accented characters
// Change to lower case
// Trim
function normalize(title) {
    return title.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase().trim();
}

function displayCommentStreamPost(item) {
    let postList = this.document.getElementById("posts");
    let postElement = this.document.createElement('li');
    postElement.textContent = item.teams[0] + " | " + item.teams[1] + " ";

    let anchor = document.createElement('a');
    anchor.setAttribute("href", item.commentsPostUrl);
    anchor.text = "Comments";

    postElement.appendChild(anchor);
    postList.appendChild(postElement);
    return postElement;
}

function displayStreamPost(item) {
    if (!item.streamPostUrl) return;
    let anchor = document.createElement('a');
    anchor.setAttribute("href", item.streamPostUrl);
    anchor.text = "Streams";
    item.listElement.append(" ");
    item.listelem.appendChild(anchor);
}

async function loadPosts(clientId, accessToken, refreshToken) {
    let lastTime = await browser.storage.local.get("time");
    if (lastTime && (new Date().getTime() - lastTime.time) < 300 * 1000 /*5 mins*/) {
        browser.storage.local.get("posts").then(
            results => {
                let parsed = JSON.parse(results.posts);
                console.log(parsed.length);
                for(let i = 0; i < parsed.length; i++) {
                    let item = new MyListItem(parsed[i].commentsPostUrl, parsed[i].teams);
                    item.listElement = displayCommentStreamPost(item);
                    displayStreamPost(item);
                }
            },
            onError
        );
        return;
    }

    const r = new snoowrap({
        userAgent: this.navigator.userAgent,
        clientId: clientId,
        accessToken: accessToken,
        refreshToken: refreshToken
    });

    r.config({ debug: config.debug });

    let listItems = [];

    r.getSubreddit('soccer').getNew().then(
        posts => forEachLoad(posts, 1),
        onError
    );

    function forEachLoad(posts, count) {
        console.log("first post on page " + count + " is " + posts[0].title);
        for (const element of posts) {
            if (!element || !isMatchPost(element.title)) continue;

            let idx = element.url.indexOf("reddit") + 6;
            let commentsPostUrl = element.url.substr(0, idx) + "-stream" + element.url.substr(idx);
            let title = normalize(element.title);
            let teams = getTeams(title);
            let item = new MyListItem(commentsPostUrl, teams);
            item.postElement = displayCommentStreamPost(item);
            listItems.push(item);
        }
        if (count < 6) {
            posts.fetchMore({ "amount": 25, "append": false }).then(
                newposts => forEachLoad(newposts, count + 1),
                onError
            );
        } else {
            setStreamLinks(r, listItems);
        }
    }
}

function setStreamLinks(r, listItems) {
    let found = [];
    for (let i = 0; i < listItems.length; i++) {
        found.push(false);
    }
    r.getSubreddit('soccerstreams').getNew().then(
        posts => {
            for (const element of posts) {
                for (let i = 0; i < listItems.length; i++) {
                    if (found[i]) continue;
                    let teams = listItems[i].teams;
                    let title = normalize(element.title);
                    if (title.includes(teams[0]) && title.includes(teams[1])) {
                        listItems[i].streamPostUrl = element.url;
                        found[i] = true;
                        displayCommentStreamPost(listItems[i]);
                    }
                }
            }
            setInStorage(listItems);
        },
        onError);
}

function setInStorage(listItems) {
    browser.storage.local.set({ time: new Date().getTime() });
    browser.storage.local.set({
        posts: JSON.stringify(listItems, function replacer(key, value) {
            return (key == "listElement") ? undefined : value;
        })
    }).then(
        () => {
            console.log("Storage done"),
                onError
        });
}

function onError(error) {
    console.log(error);
}

function getTeams(title) {
    return [getTeam1(title), getTeam2(title)];
}

// Functions below assume title follows the pattern
// "Match thread: 'Team 1' vs. 'Team2' [League Name]"

function isMatchPost(postTitle) {
    if (!postTitle) return false;
    postTitle = normalize(postTitle);
    return (postTitle.indexOf("match thread") == 0) &&
        /*!postTitle.includes('request') &&*/
        postTitle.includes('vs');
}

function getTeam1(title) {
    // let tmp = title.split("vs");
    // if (tmp.length < 2) return "None";
    // tmp = tmp[0].split("]");
    // if (tmp.length < 2) return "None";
    // return tmp[1].trim();
    let tmp = title.split("vs");
    if (tmp.length < 2) return "None";
    tmp = tmp[0].split(":");
    if (tmp.length < 2) return "None";
    return tmp[1].trim();
}

function getTeam2(title) {
    // let tmp = title.split("vs");
    // if (tmp.length < 2) return "None";
    // return tmp[1].trim();

    let tmp = title.split("vs");
    if (tmp.length < 2) return "None";
    tmp = tmp[1].split("[");
    if (tmp.length < 2) return "None";
    tmp = tmp[0].trim();
    if (tmp[0] == '.') tmp = tmp.substr(1);
    return tmp.trim();
}