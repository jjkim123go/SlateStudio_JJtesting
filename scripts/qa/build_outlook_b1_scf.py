"""Build the OutlookScene MailHome (Wave B / Agent B1) QA SCF.

Authors the slot HTML for the `viewBodyHtml` prop and writes the SCF JSON.
Re-run after editing the HTML/CSS below to regenerate the JSON deterministically.
"""

from __future__ import annotations

import json
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
OUT = REPO / "tests" / "qa-scenarios" / "outlook-mail-home-b1.scf.json"

# ─────────────────────────────────────────────────────────────────────────────
# Inline Fluent System Icons (24px regular outline, simplified to 20-box paths)
# ─────────────────────────────────────────────────────────────────────────────
ICON = {
    "chevron_down": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    "chevron_right": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8 5l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    "inbox": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 3.5h10a2 2 0 0 1 2 2V14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2zm0 1A1 1 0 0 0 4 5.5V11h3.6l1 2h2.8l1-2H16V5.5a1 1 0 0 0-1-1H5z" fill="currentColor"/></svg>',
    "drafts": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M14.4 3.6a2 2 0 0 1 2.8 2.8l-9.2 9.2-3.6.8.8-3.6 9.2-9.2z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>',
    "sent": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10l14-6-6 14-2-6-6-2z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>',
    "delete": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8 3.5h4M4 5.5h12M6 5.5l1 11h6l1-11" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    "junk": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.5l6 2.5v5c0 4-2.6 6.5-6 7-3.4-.5-6-3-6-7V5l6-2.5z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M7 7l6 6M13 7l-6 6" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
    "archive": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 5h14v3H3zM4 8h12v9H4zM8 11h4" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"/></svg>',
    "notes": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 3h8.5L16 6.5V17H4V3zM12.5 3v3.5H16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>',
    "conversation": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H8l-3 3v-3H5a2 2 0 0 1-2-2V5z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>',
    "flag": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 3v14M5 4h10l-2 3 2 3H5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"/></svg>',
    "flag_filled": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 3v14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M5 4h10l-2 3 2 3H5z" fill="currentColor"/></svg>',
    "paperclip": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M14.5 7l-6.4 6.4a2 2 0 0 0 2.8 2.8l6.5-6.5a4 4 0 0 0-5.6-5.6L4.5 10.5a6 6 0 0 0 8.5 8.5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    "filter": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 5h14l-5 6v5l-4-2v-3L3 5z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>',
    "sort": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4v12M6 4l-2 3M6 4l2 3M14 16V4M14 16l-2-3M14 16l2-3" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    "select": '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3.5" y="3.5" width="13" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>',
    "reply": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M9 5L4 10l5 5M4.5 10H12a4 4 0 0 1 4 4v2" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    "reply_all": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 5L1.5 10 6 15M10 5l-4.5 5L10 15M5.5 10H13a4 4 0 0 1 4 4v2" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    "forward": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M11 5l5 5-5 5M15.5 10H8a4 4 0 0 0-4 4v2" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    "more": '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="5" cy="10" r="1.3" fill="currentColor"/><circle cx="10" cy="10" r="1.3" fill="currentColor"/><circle cx="15" cy="10" r="1.3" fill="currentColor"/></svg>',
}

# ─────────────────────────────────────────────────────────────────────────────
# CSS (b1- prefix throughout)
# ─────────────────────────────────────────────────────────────────────────────
CSS = """
.b1-mail{display:flex;flex:1 1 auto;min-width:0;min-height:0;width:100%;background:var(--ol-bg);font-family:"Segoe UI Variable","Segoe UI",-apple-system,BlinkMacSystemFont,system-ui,sans-serif;color:var(--ol-text-primary);}

/* === Folder pane === */
.b1-folders{width:260px;flex-shrink:0;background:var(--ol-bg);border-right:1px solid var(--ol-divider);padding:6px 8px 8px 8px;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;gap:2px;}
.b1-section{display:flex;align-items:center;gap:4px;padding:8px 8px 6px;color:var(--ol-text-secondary);font-size:12px;font-weight:600;user-select:none;}
.b1-section svg{width:12px;height:12px;flex-shrink:0;}
.b1-row{display:flex;align-items:center;gap:12px;padding:0 12px;border-radius:4px;font-size:13px;color:var(--ol-text-primary);height:30px;box-sizing:border-box;cursor:default;}
.b1-row:hover{background:var(--ol-surface-hover);}
.b1-row.b1-active{background:#e5f1fb;font-weight:600;}
.b1-row svg{width:16px;height:16px;color:var(--ol-text-secondary);flex-shrink:0;}
.b1-row.b1-active svg{color:var(--ol-accent);}
.b1-fname{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;}
.b1-fcount{color:var(--ol-text-secondary);font-size:12px;font-weight:400;}
.b1-account{display:flex;align-items:center;gap:6px;padding:8px 8px 4px;color:var(--ol-text-primary);font-size:12px;font-weight:600;user-select:none;}
.b1-account svg{width:12px;height:12px;color:var(--ol-text-secondary);}
.b1-account-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}

/* === Message list === */
.b1-msglist{width:380px;flex-shrink:0;background:var(--ol-surface);border-right:1px solid var(--ol-divider);display:flex;flex-direction:column;overflow:hidden;}
.b1-msglist-head{display:flex;align-items:center;padding:14px 16px 10px;gap:16px;}
.b1-pivot{display:flex;gap:18px;flex:1;}
.b1-pivot-item{font-size:14px;color:var(--ol-text-secondary);padding-bottom:6px;font-weight:400;cursor:default;line-height:1;}
.b1-pivot-item.b1-active{color:var(--ol-text-primary);font-weight:600;border-bottom:2px solid var(--ol-accent);}
.b1-tools{display:flex;gap:2px;align-items:center;color:var(--ol-text-secondary);}
.b1-iconbtn{width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;border-radius:4px;cursor:default;}
.b1-iconbtn:hover{background:var(--ol-surface-hover);}
.b1-iconbtn svg{width:16px;height:16px;}
.b1-msglist-scroll{flex:1;overflow:hidden;}
.b1-date{display:flex;align-items:center;gap:6px;padding:12px 16px 6px;font-size:13px;font-weight:600;color:var(--ol-text-primary);}
.b1-date svg{width:11px;height:11px;color:var(--ol-text-secondary);}
.b1-msg{display:flex;gap:10px;padding:10px 16px 12px 16px;border-left:3px solid transparent;cursor:default;position:relative;}
.b1-msg:hover{background:var(--ol-surface-hover);}
.b1-msg.b1-selected{background:#e5f1fb;border-left-color:var(--ol-accent);}
.b1-msg.b1-unread::after{content:"";position:absolute;left:5px;top:50%;transform:translateY(-50%);width:7px;height:7px;background:var(--ol-accent);border-radius:50%;}
.b1-avatar{width:32px;height:32px;border-radius:50%;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:600;letter-spacing:.3px;}
.b1-mbody{flex:1;min-width:0;}
.b1-mrow1{display:flex;align-items:baseline;justify-content:space-between;gap:8px;}
.b1-sender{font-size:13.5px;font-weight:600;color:var(--ol-text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.b1-msg.b1-unread .b1-sender{font-weight:700;}
.b1-time{font-size:12px;color:var(--ol-text-secondary);flex-shrink:0;white-space:nowrap;}
.b1-msg.b1-unread .b1-time{color:var(--ol-accent);font-weight:600;}
.b1-subject{font-size:12.5px;color:var(--ol-text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;font-weight:400;}
.b1-msg.b1-unread .b1-subject{font-weight:600;}
.b1-mrow3{display:flex;align-items:center;gap:6px;margin-top:2px;}
.b1-preview{font-size:12px;color:var(--ol-text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0;}
.b1-micons{display:inline-flex;gap:6px;color:var(--ol-text-secondary);flex-shrink:0;align-items:center;}
.b1-micons svg{width:13px;height:13px;}
.b1-micons .b1-flag{color:#d83b01;}

/* === Reading pane === */
.b1-reader{flex:1 1 auto;min-width:0;background:var(--ol-surface);overflow:hidden;display:flex;flex-direction:column;}
.b1-reader-tools{display:flex;align-items:center;justify-content:space-between;padding:14px 24px 12px 24px;gap:16px;border-bottom:1px solid var(--ol-divider);}
.b1-rfrom{display:flex;align-items:center;gap:12px;min-width:0;}
.b1-rfrom .b1-avatar{width:36px;height:36px;font-size:13px;}
.b1-rmeta{display:flex;flex-direction:column;min-width:0;}
.b1-rsender{font-size:14px;font-weight:600;color:var(--ol-text-primary);}
.b1-rrecip{font-size:12px;color:var(--ol-text-secondary);}
.b1-rrecip b{color:var(--ol-text-primary);font-weight:600;}
.b1-ractions{display:flex;align-items:center;gap:2px;color:var(--ol-text-secondary);}
.b1-ractions .b1-iconbtn:hover{color:var(--ol-text-primary);}
.b1-rdate{font-size:12px;color:var(--ol-text-secondary);margin-left:12px;flex-shrink:0;white-space:nowrap;}
.b1-reader-body{padding:24px 32px 28px 32px;overflow:hidden;flex:1;}
.b1-rsubject{font-size:24px;font-weight:600;color:var(--ol-text-primary);margin:0 0 18px 0;line-height:1.25;letter-spacing:-.2px;}
.b1-actionbar{display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap;}
.b1-pill{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border:1px solid var(--ol-divider-strong);border-radius:4px;font-size:13px;color:var(--ol-text-primary);background:var(--ol-surface);cursor:default;}
.b1-pill:hover{background:var(--ol-surface-hover);}
.b1-pill svg{width:14px;height:14px;color:var(--ol-text-secondary);}
.b1-prose{font-size:14px;line-height:1.55;color:var(--ol-text-primary);max-width:760px;}
.b1-prose p{margin:0 0 14px 0;}
.b1-prose ul{margin:0 0 14px 0;padding-left:22px;}
.b1-prose li{margin-bottom:4px;}
.b1-signoff{margin-top:22px;color:var(--ol-text-primary);}

/* Avatar palette */
.b1-av-1{background:#6264a7;}
.b1-av-2{background:#8764b8;}
.b1-av-3{background:#ca5010;}
.b1-av-4{background:#038387;}
.b1-av-5{background:#4f6bed;}
.b1-av-6{background:#498205;}
.b1-av-7{background:#c239b3;}
"""


def folder_row(icon: str, name: str, count: str = "", active: bool = False) -> str:
    cls = "b1-row b1-active" if active else "b1-row"
    count_html = f'<span class="b1-fcount">{count}</span>' if count else ""
    return (
        f'<div class="{cls}">{ICON[icon]}'
        f'<span class="b1-fname">{name}</span>{count_html}</div>'
    )


def msg_card(
    initials: str,
    av: int,
    sender: str,
    subject: str,
    preview: str,
    time: str,
    *,
    unread: bool = False,
    selected: bool = False,
    flagged: bool = False,
    attachment: bool = False,
) -> str:
    classes = ["b1-msg"]
    if unread:
        classes.append("b1-unread")
    if selected:
        classes.append("b1-selected")
    icons = ""
    if flagged or attachment:
        bits = []
        if attachment:
            bits.append(ICON["paperclip"])
        if flagged:
            bits.append(f'<span class="b1-flag">{ICON["flag_filled"]}</span>')
        icons = f'<span class="b1-micons">{"".join(bits)}</span>'
    return (
        f'<div class="{" ".join(classes)}">'
        f'<span class="b1-avatar b1-av-{av}">{initials}</span>'
        f'<div class="b1-mbody">'
        f'<div class="b1-mrow1"><span class="b1-sender">{sender}</span>'
        f'<span class="b1-time">{time}</span></div>'
        f'<div class="b1-subject">{subject}</div>'
        f'<div class="b1-mrow3"><span class="b1-preview">{preview}</span>{icons}</div>'
        f'</div></div>'
    )


def build_slot_html() -> str:
    folders_html = (
        '<div class="b1-section">' + ICON["chevron_down"] + "<span>Favorites</span></div>"
        + folder_row("inbox", "Inbox", "12")
        + folder_row("sent", "Sent Items")
        + folder_row("drafts", "Drafts", "3")
        + '<div class="b1-account">' + ICON["chevron_down"]
        + '<span class="b1-account-name">alex.chen@contoso.com</span></div>'
        + folder_row("inbox", "Inbox", "12", active=True)
        + folder_row("junk", "Junk Email")
        + folder_row("drafts", "Drafts", "3")
        + folder_row("sent", "Sent Items")
        + folder_row("delete", "Deleted Items", "84")
        + folder_row("archive", "Archive")
        + folder_row("notes", "Notes")
        + folder_row("conversation", "Conversation History")
    )

    msglist_head = (
        '<div class="b1-msglist-head">'
        '<div class="b1-pivot">'
        '<span class="b1-pivot-item b1-active">Focused</span>'
        '<span class="b1-pivot-item">Other</span>'
        '</div>'
        '<div class="b1-tools">'
        f'<span class="b1-iconbtn">{ICON["select"]}</span>'
        f'<span class="b1-iconbtn">{ICON["filter"]}</span>'
        f'<span class="b1-iconbtn">{ICON["sort"]}</span>'
        '</div>'
        '</div>'
    )

    today_cards = (
        f'<div class="b1-date">{ICON["chevron_down"]}<span>Today</span></div>'
        + msg_card(
            "JP", 1, "Jordan Park", "Q4 Roadmap Review",
            "Sharing the updated deck ahead of Friday's session — please review the new milestone slide and ping me with any...",
            "10:43 AM", selected=True, flagged=True,
        )
        + msg_card(
            "SR", 3, "Sam Rivera", "Design Critique sync",
            "Quick reminder that critique is moving to 2pm tomorrow. I'll send a fresh Figma link in the invite shortly.",
            "10:40 AM", unread=True,
        )
        + msg_card(
            "MS", 4, "Morgan Singh", "Architecture review notes",
            "Thanks again for joining — attached are the consolidated notes from this morning's review with action items called...",
            "9:15 AM", unread=True, attachment=True,
        )
    )
    yesterday_cards = (
        f'<div class="b1-date">{ICON["chevron_down"]}<span>Yesterday</span></div>'
        + msg_card(
            "CL", 2, "Casey Lee", "Sprint planning recap",
            "Posting the recap and capacity numbers from yesterday's planning. Let me know if anything looks off before I lock...",
            "Tue 4:18 PM",
        )
    )
    lastweek_cards = (
        f'<div class="b1-date">{ICON["chevron_down"]}<span>Last week</span></div>'
        + msg_card(
            "RB", 5, "Riley Brooks", "Weekly status update",
            "Hi team — here's the rollup for week 14. We're tracking green on the platform stream and yellow on the data ingest...",
            "Mon 8:02 AM",
        )
    )

    msglist_html = (
        '<div class="b1-msglist">'
        + msglist_head
        + '<div class="b1-msglist-scroll">'
        + today_cards
        + yesterday_cards
        + lastweek_cards
        + '</div></div>'
    )

    reader_tools = (
        '<div class="b1-reader-tools">'
        '<div class="b1-rfrom">'
        '<span class="b1-avatar b1-av-1">JP</span>'
        '<div class="b1-rmeta">'
        '<span class="b1-rsender">Jordan Park</span>'
        '<span class="b1-rrecip">To: <b>Alex Chen</b>, Sam Rivera, Morgan Singh</span>'
        '</div></div>'
        '<div class="b1-ractions">'
        f'<span class="b1-iconbtn">{ICON["reply"]}</span>'
        f'<span class="b1-iconbtn">{ICON["reply_all"]}</span>'
        f'<span class="b1-iconbtn">{ICON["forward"]}</span>'
        f'<span class="b1-iconbtn">{ICON["flag"]}</span>'
        f'<span class="b1-iconbtn">{ICON["more"]}</span>'
        '<span class="b1-rdate">Wed 4/16/2026 10:43 AM</span>'
        '</div></div>'
    )

    reader_body = (
        '<div class="b1-reader-body">'
        '<h1 class="b1-rsubject">Q4 Roadmap Review</h1>'
        '<div class="b1-actionbar">'
        f'<span class="b1-pill">{ICON["reply"]}<span>Reply</span></span>'
        f'<span class="b1-pill">{ICON["reply_all"]}<span>Reply all</span></span>'
        f'<span class="b1-pill">{ICON["forward"]}<span>Forward</span></span>'
        '</div>'
        '<div class="b1-prose">'
        '<p>Hi all,</p>'
        '<p>Sharing the updated Q4 roadmap deck ahead of Friday\u2019s review. The biggest change since last week is the '
        'reordering of the platform milestones \u2014 we moved the ingestion refactor up by two weeks so it lands before the '
        'reporting work begins, which should unblock the analytics team in early November.</p>'
        '<p>A few things I\u2019d like us to align on before the meeting:</p>'
        '<ul>'
        '<li>The owner for the data quality workstream (currently TBD on slide 7).</li>'
        '<li>Whether we keep the December freeze date or extend by one sprint to absorb the dependency from the platform team.</li>'
        '<li>Final scope for the customer-facing dashboard \u2014 we have two options on slide 12.</li>'
        '</ul>'
        '<p>I\u2019ll keep the deck open for comments through Thursday afternoon. If you have anything you\u2019d like '
        'covered live, drop it in the agenda doc and I\u2019ll fold it into the walkthrough. Otherwise, plan on roughly '
        '20 minutes of presentation and 25 minutes of discussion so we leave time for the budget conversation at the end.</p>'
        '<p class="b1-signoff">Thanks,<br>Jordan</p>'
        '</div></div>'
    )

    reader_html = '<div class="b1-reader">' + reader_tools + reader_body + '</div>'

    return (
        '<style>'
        + CSS
        + '</style>'
        + '<div class="b1-mail">'
        + '<aside class="b1-folders">' + folders_html + '</aside>'
        + msglist_html
        + reader_html
        + '</div>'
    )


def main() -> None:
    slot_html = build_slot_html()

    scf = {
        "version": "1.0",
        "pipeline": "synthetic-recording",
        "outputProfile": {"width": 1920, "height": 1080, "fps": 30},
        "scenes": [
            {
                "id": "outlook-mail-home-b1",
                "duration": 4,
                "component": "OutlookScene",
                "props": {
                    "theme": "light",
                    "ribbonVariant": "mail-home",
                    "activeRail": "mail",
                    "accountName": "Alex Chen",
                    "searchPlaceholder": "Search or ask Copilot",
                    "notifCount": 9,
                    "toastState": "hidden",
                    "viewBodyHtml": slot_html,
                },
            }
        ],
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(scf, indent=2), encoding="utf-8")
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
