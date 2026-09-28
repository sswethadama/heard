<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep all two-person room data behind server functions; anonymous clients authenticate with separate unguessable participant tokens so private text never enters the browser bundle or public data API.
- Two-device rooms get instant updates by listening to the public `rooms` status table (names + status only); private texts stay in heard_rooms behind server functions so live updates never expose them.
- Keep the ocean backdrop as a fixed, non-interactive CSS/inline-SVG layer so it never affects the conflict-resolution flow or page layout.
