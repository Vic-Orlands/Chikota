<script lang="ts">
  import { resolve } from '$app/paths';
  import { authClient } from '$lib/auth-client';
  import { themeStore, type Theme } from '$lib/stores/theme.svelte';
  import {
    Archive,
    Bell,
    BookmarkFilled,
    Pin
  } from '$lib/components/icons/radix';

  let signingIn = $state(false);

  const preview = [
    {
      title: 'notes from the svelte team',
      host: 'svelte.dev',
      url: 'https://svelte.dev/blog',
      letter: 'S'
    },
    {
      title: 'a thoughtful approach to color',
      host: 'radix-ui.com',
      url: 'https://www.radix-ui.com/colors',
      letter: 'R'
    },
    {
      title: 'a space for connecting ideas',
      host: 'are.na',
      url: 'https://www.are.na/',
      letter: 'A'
    },
    {
      title: 'the language of the web',
      host: 'developer.mozilla.org',
      url: 'https://developer.mozilla.org/en-US/docs/Web/CSS',
      letter: 'D'
    }
  ];

  const themes: { id: Theme; label: string }[] = [
    { id: 'light', label: 'paper' },
    { id: 'forest', label: 'forest' },
    { id: 'ember', label: 'ember' }
  ];

  async function signIn() {
    signingIn = true;
    try {
      await authClient.signIn.social({ provider: 'google' });
    } catch {
      signingIn = false;
    }
  }
</script>

<svelte:head>
  <title>chikọta — a quiet place for the links you keep</title>
</svelte:head>

<div
  class="landing [width:min(820px,_calc(100%_-_40px))] [margin:0_auto] [min-height:100dvh] flex flex-col max-[720px]:[width:calc(100%_-_28px)] max-[520px]:[width:calc(100%_-_20px)]"
>
  <header
    class="landing-bar flex items-center justify-between [gap:16px] [padding-block:18px] [min-height:72px] max-[720px]:flex-wrap max-[720px]:[padding-block:16px_8px]"
  >
    <a
      class="wordmark flex items-center [gap:10px] [width:fit-content] [&_h1]:[font-size:32px] [&_h1]:font-normal [&_h1]:[letter-spacing:normal] [&_h1]:m-0 [&_svg]:[color:var(--foreground)] max-[520px]:[&_h1]:[font-size:30px]"
      href={resolve('/')}
      aria-label="chikota home"><h1>chikota</h1></a
    >
    <div class="landing-tools flex items-center [gap:10px]">
      <div
        class="theme-pills flex [padding:2px] [border:1px_solid_var(--border)] [border-radius:22px] [background:var(--sidebar)]"
        role="group"
        aria-label="appearance"
      >
        {#each themes as theme (theme.id)}
          <button
            type="button"
            class={[
              'theme-pill border-0 bg-transparent [color:var(--muted-foreground)] [border-radius:18px] [padding:5px_10px] [font-size:11px] [min-height:26px] [&.active]:[background:var(--background)] [&.active]:[color:var(--foreground)] [&.active]:[box-shadow:0_0_0_1px_color-mix(in_srgb,_var(--border)_80%,_transparent)]',
              { active: themeStore.current === theme.id }
            ]}
            aria-pressed={themeStore.current === theme.id}
            onclick={() => themeStore.set(theme.id)}>{theme.label}</button
          >
        {/each}
      </div>
      <!-- <button
        type="button"
        class="plain-button [&_svg]:block inline-flex items-center [gap:var(--icon-text-gap)] [padding:5px_6px] border-0 [border-radius:5px] bg-transparent [color:var(--foreground)] [font-size:var(--body-font-size)] whitespace-nowrap [&:hover]:[background:var(--secondary)] [&.control-active]:[background:var(--secondary)] [&.control-active]:[color:var(--foreground)] max-[520px]:[padding:6px_4px] max-[520px]:[font-size:var(--body-font-size)]"
        disabled={signingIn}
        onclick={signIn}>{signingIn ? 'redirecting…' : 'sign in'}</button
      > -->
    </div>
  </header>

  <main class="landing-main flex-1 flex flex-col [padding-block:12px_36px]">
    <section
      class="hero [max-width:34rem] [padding:28px_0_36px] max-[720px]:[padding-top:18px] motion-safe:[animation:rise_520ms_cubic-bezier(0.22,_1,_0.36,_1)_both]"
    >
      <p
        class="eyebrow [margin:0_0_10px] [color:var(--muted-foreground)] [font-size:11px] [letter-spacing:0.08em]"
      >
        igbo · gather
      </p>
      <h2
        class="m-0 [font-size:clamp(48px,_8vw,_76px)] [line-height:0.95] [color:var(--foreground)]"
      >
        your reading room.
      </h2>
      <p
        class="lede [margin:18px_0_0] [max-width:28rem] [color:var(--muted-foreground)] [font-size:15px] [line-height:1.55]"
      >
        a quiet place for the links you want to keep. save a find, pin it, come
        back when you have a moment — not another folder of forgotten bookmarks.
      </p>
      <div class="cta flex flex-wrap [gap:8px] [margin-top:28px]">
        <button
          type="button"
          class="secondary-button google inline-flex items-center justify-center [gap:var(--icon-text-gap)] [border:1px_solid_var(--border)] [border-radius:6px] [padding:5px_9px] [font-size:11px] [min-height:30px] whitespace-nowrap [background:var(--card)] [&:hover]:[background:var(--secondary)] motion-safe:[transition:transform_120ms_ease] motion-safe:[&:active]:[transform:scale(0.97)]"
          disabled={signingIn}
          onclick={signIn}
        >
          <svg
            class="google-mark [width:12px] [height:12px]"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {signingIn ? 'redirecting…' : 'sign in with google'}
        </button>
      </div>
    </section>

    <section
      class="preview [margin:8px_0_8px] motion-safe:[animation:rise_520ms_cubic-bezier(0.22,_1,_0.36,_1)_both] motion-safe:[animation-delay:80ms]"
      aria-hidden="true"
    >
      <div
        class="preview-frame overflow-hidden [border:1px_solid_var(--border)] [border-radius:10px] [background:var(--card)]"
      >
        <div
          class="preview-toolbar flex items-center justify-between [gap:10px] [padding:12px_14px_10px] [border-bottom:1px_solid_var(--soft-border)] [color:var(--muted-foreground)]"
        >
          <span
            class="preview-title inline-flex items-center [gap:7px] [color:var(--foreground)] [font-family:var(--font-heading)] [font-size:22px] [line-height:1]"
            ><BookmarkFilled size={13} />bookmarks</span
          >
          <span class="preview-count [font-size:11px]">{preview.length}</span>
        </div>
        {#each preview as item, index (item.host)}
          <article
            class="preview-row grid [grid-template-columns:auto_1fr_auto] items-center [gap:12px] [padding:12px_14px] [color:var(--muted-foreground)] [&+.preview-row]:[border-top:1px_solid_var(--soft-border)] [&_strong]:block [&_strong]:[color:var(--foreground)] [&_strong]:[font-size:13px] [&_strong]:font-medium [&_small]:block [&_small]:[margin-top:2px] [&_small]:[font-size:11px]"
          >
            <span
              class="preview-mark relative grid place-items-center [width:28px] [height:28px] overflow-hidden [border-radius:6px] [background:var(--secondary)] [color:var(--foreground)] [font-size:11px] font-medium [&_img]:absolute [&_img]:[inset:5px] [&_img]:[width:18px] [&_img]:[height:18px] [&_img]:object-contain"
              >{item.letter}<img
                src={`https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(item.url)}&sz=32`}
                alt=""
                onerror={(event) => event.currentTarget.remove()}
              /></span
            >
            <div>
              <strong>{item.title}</strong>
              <small>{item.host}</small>
            </div>
            {#if index === 0}<Pin size={12} />{/if}
            {#if index === 2}<Bell size={12} />{/if}
          </article>
        {/each}
      </div>
    </section>

    <section
      class="features grid [grid-template-columns:repeat(3,_minmax(0,_1fr))] [gap:0] [margin-top:44px] [border-block:1px_solid_color-mix(in_srgb,_var(--border)_58%,_transparent)] [&_article]:[padding:22px_18px_22px_0] [&_article+article]:[padding-left:18px] [&_article+article]:[border-left:1px_solid_color-mix(in_srgb,_var(--border)_58%,_transparent)] [&_h3]:flex [&_h3]:items-center [&_h3]:[gap:8px] [&_h3]:[margin:0_0_8px] [&_h3]:[font-size:26px] [&_p]:m-0 [&_p]:[color:var(--muted-foreground)] [&_p]:[font-size:13px] [&_p]:[line-height:1.5] max-[720px]:[grid-template-columns:1fr] max-[720px]:[&_article]:[padding:18px_0] max-[720px]:[&_article]:[border-left:0] max-[720px]:[&_article+article]:[padding:18px_0] max-[720px]:[&_article+article]:[border-left:0] max-[720px]:[&_article+article]:[border-top:1px_solid_color-mix(in_srgb,_var(--border)_58%,_transparent)] motion-safe:[animation:rise_520ms_cubic-bezier(0.22,_1,_0.36,_1)_both] motion-safe:[animation-delay:140ms]"
      aria-label="what chikota is for"
    >
      <article>
        <h3><Archive size={14} />collect</h3>
        <p>
          save a link with a name and a note. keep related finds together in a
          collection, or leave them in the open library.
        </p>
      </article>
      <article>
        <h3><Pin size={14} />return</h3>
        <p>
          pin what you need close. search from anywhere. the good finds stay
          easy to open again.
        </p>
      </article>
      <article>
        <h3><Bell size={14} />remember</h3>
        <p>
          set a reminder for later — a quiet ping in the browser, or an email
          when you ask for one.
        </p>
      </article>
    </section>
  </main>

  <footer
    class="landing-foot flex flex-wrap items-center justify-between [gap:12px_24px] [padding-block:18px_28px] [color:var(--muted-foreground)] [font-size:12px] [&_p]:m-0 [&_p]:[max-width:28rem]"
  >
    <p>
      “chikọta” is igbo for gather. a small room for the web you mean to keep.
    </p>
    <div class="flex items-center [gap:14px]">
      <a
        href="https://mezie.dev"
        target="_blank"
        rel="noopener noreferrer"
        class="whitespace-nowrap [color:inherit] [text-decoration:none] hover:[color:var(--foreground)] focus-visible:[outline:2px_solid_var(--accent-text)] focus-visible:[outline-offset:3px]"
        >Built by MezieIV</a
      >
      <a
        href="https://github.com/Vic-Orlands"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="MezieIV on GitHub"
        class="inline-flex [color:inherit] hover:[color:var(--foreground)] focus-visible:[outline:2px_solid_var(--accent-text)] focus-visible:[outline-offset:3px]"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.55.1.76-.24.76-.54v-2.12c-3.1.67-3.76-1.32-3.76-1.32-.5-1.28-1.23-1.62-1.23-1.62-1.01-.69.08-.68.08-.68 1.12.08 1.71 1.15 1.71 1.15.99 1.7 2.6 1.21 3.23.93.1-.72.39-1.21.7-1.49-2.47-.28-5.07-1.24-5.07-5.49 0-1.21.43-2.2 1.14-2.98-.12-.28-.5-1.41.11-2.94 0 0 .93-.3 3.05 1.14A10.6 10.6 0 0 1 12 6.17c.94 0 1.88.13 2.76.37 2.12-1.44 3.05-1.14 3.05-1.14.61 1.53.23 2.66.11 2.94.71.78 1.14 1.77 1.14 2.98 0 4.26-2.6 5.2-5.08 5.48.4.35.75 1.04.75 2.1v3.09c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9Z"
          />
        </svg>
      </a>
      <a
        href="https://www.linkedin.com/in/victor-innocent"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="MezieIV on LinkedIn"
        class="inline-flex [color:inherit] hover:[color:var(--foreground)] focus-visible:[outline:2px_solid_var(--accent-text)] focus-visible:[outline-offset:3px]"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            d="M20.45 2H3.55C2.69 2 2 2.68 2 3.52v16.96c0 .84.69 1.52 1.55 1.52h16.9c.86 0 1.55-.68 1.55-1.52V3.52c0-.84-.69-1.52-1.55-1.52ZM7.93 18.75H4.98V9.2h2.95v9.55ZM6.46 7.9a1.71 1.71 0 1 1 0-3.42 1.71 1.71 0 0 1 0 3.42Zm12.3 10.85h-2.95V14.1c0-1.11-.02-2.54-1.55-2.54-1.55 0-1.79 1.21-1.79 2.46v4.73H9.52V9.2h2.83v1.3h.04c.39-.74 1.36-1.52 2.79-1.52 2.98 0 3.58 1.96 3.58 4.51v5.26Z"
          />
        </svg>
      </a>
    </div>
  </footer>
</div>
