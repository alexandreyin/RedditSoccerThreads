function normalize(title) {
    return title.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase().trim();
}

function isMatchPost(post) {
    if (!post || !post.title) return false;
    title = normalize(post.title);
    return (title.indexOf("match thread") == 0) && /*!title.includes('request') &&*/ title.includes('vs');
}

let postList = this.document.getElementById("posts");

//window.addEventListener("load", function() {
function loadPosts(clientId, accessToken, refreshToken) {
    const r = new snoowrap({
        userAgent: this.navigator.userAgent,
        clientId: "hdGbtiI3sBPzjw",//clientId,
        clientSecret: "",
        accessToken: accessToken,
        refreshToken: refreshToken
    });
    r.config({debug: true});
    let matches = [];    

    r.getSubreddit('soccer').getNew().then(posts => {
        forEachLoad(posts, 1);
    });

    function forEachLoad(posts, count) {
        //console.log("First post of page " + count + " " + posts[0].title);
        for (const element of posts) {
            if (!isMatchPost(element)) continue;
            this.console.log(element.title);
            let post = this.document.createElement('li');
            post.id = "Match " + (matches.length+1);
            title = normalize(element.title);
            let teams = getTeams(title.toLowerCase());
            matches.push(teams);
            post.textContent = /*title + "\nTeams: " +*/
                teams[0] + " | " + teams[1] + " ";
            let anchor = document.createElement('a');
            let idx = element.url.indexOf("reddit") + 6;
            let streamUrl = element.url.substr(0, idx) + "-stream" + element.url.substr(idx);
            anchor.setAttribute("href", streamUrl);
            anchor.text = "Comments";
            post.appendChild(anchor);
            postList.appendChild(post);
        }
        if (count < 4) {
            posts.fetchMore({ "amount": 25, "append": false }).then(newposts => forEachLoad(newposts, count + 1),
                error => console.log(error)).catch(error => console.log("Thrown " + error));
        } else {
            setStreamLinks(r, matches);
        }
    }
}

function setStreamLinks(r, matches) {
    let found = [];
    for (let i = 0; i < matches.length; i++) {
        found.push(false);
    }
    r.getSubreddit('soccerstreams').getNew().then(posts => {
        for (const element of posts) {
            for (let i = 0; i < matches.length; i++) {
                if (found[i]) continue;
                let match = matches[i];
                let team1 = match[0];
                let team2 = match[1];
                title = normalize(element.title);
                if (true || (title.includes(team1) && title.includes(team2))) {
                    let listelem = document.getElementById("Match " + (i + 1));
                    let anchor = document.createElement('a');
                    anchor.setAttribute("href", element.url);
                    anchor.text = "Streams";
                    listelem.append(" ");
                    listelem.appendChild(anchor);
                    found[i] = true;
                }
            }
        }
    });
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

function getTeams(title) {
    return [getTeam1(title), getTeam2(title)];
}