<script lang="ts">
  import { resolve } from '$app/paths';
  import { authClient } from '$lib/auth-client';
  import { themeStore, type Theme } from '$lib/stores/theme.svelte';
  import {
    Archive,
    ArrowRight,
    Bell,
    BookmarkFilled,
    Pin
  } from '$lib/components/icons/radix';

  let { onenter }: { onenter: () => void } = $props();

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
  class="landing [width:min(820px,_calc(100%_-_40px))] [margin:0_auto] [min-height:100dvh] flex flex-col [border-inline:1px_solid_color-mix(in_srgb,_var(--border)_58%,_transparent)] max-[720px]:[width:calc(100%_-_28px)] max-[520px]:[width:calc(100%_-_20px)]"
>
  <header
    class="landing-bar flex items-center justify-between [gap:16px] [padding:18px_10px] [min-height:72px] max-[720px]:flex-wrap max-[720px]:[padding:16px_10px_8px]"
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

  <main
    class="landing-main flex-1 flex flex-col [padding:12px_22px_36px] max-[720px]:[padding-inline:14px] max-[520px]:[padding-inline:10px]"
  >
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
      <div
        class="cta flex flex-wrap [gap:8px] [margin-top:28px] max-[520px]:flex-col max-[520px]:items-stretch"
      >
        <button
          type="button"
          class="primary-button enter inline-flex items-center justify-center [gap:var(--icon-text-gap)] [border:1px_solid_transparent] [border-radius:6px] [padding:7px_10px] [font-size:var(--body-font-size)] font-medium [min-height:30px] whitespace-nowrap [background:var(--primary)] [color:var(--primary-foreground)] [&:hover]:[filter:brightness(1.12)] motion-safe:[transition:transform_120ms_ease] motion-safe:[&:active]:[transform:scale(0.97)] [min-height:38px] [padding:8px_14px] [font-size:12px] max-[520px]:w-full"
          onclick={onenter}
        >
          start collecting<ArrowRight size={14} />
        </button>
        <button
          type="button"
          class="secondary-button google inline-flex items-center justify-center [gap:var(--icon-text-gap)] [border:1px_solid_transparent] [border-radius:6px] [padding:7px_10px] [font-size:var(--body-font-size)] font-medium [min-height:30px] whitespace-nowrap [background:var(--card)] [border-color:var(--border)] [&:hover]:[background:var(--secondary)] motion-safe:[transition:transform_120ms_ease] motion-safe:[&:active]:[transform:scale(0.97)] [min-height:38px] [padding:8px_14px] [font-size:12px] max-[520px]:w-full"
          disabled={signingIn}
          onclick={signIn}
        >
          <svg
            class="google-mark [width:14px] [height:14px]"
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
      class="features grid [grid-template-columns:repeat(3,_minmax(0,_1fr))] [gap:0] [margin-top:28px] [border-top:1px_solid_color-mix(in_srgb,_var(--border)_58%,_transparent)] [&_article]:[padding:22px_18px_8px_0] [&_article+article]:[padding-left:18px] [&_article+article]:[border-left:1px_solid_color-mix(in_srgb,_var(--border)_58%,_transparent)] [&_h3]:flex [&_h3]:items-center [&_h3]:[gap:8px] [&_h3]:[margin:0_0_8px] [&_h3]:[font-size:26px] [&_p]:m-0 [&_p]:[color:var(--muted-foreground)] [&_p]:[font-size:13px] [&_p]:[line-height:1.5] max-[720px]:[grid-template-columns:1fr] max-[720px]:[&_article]:[padding:18px_0] max-[720px]:[&_article]:[border-left:0] max-[720px]:[&_article]:[border-top:1px_solid_color-mix(in_srgb,_var(--border)_58%,_transparent)] max-[720px]:[&_article+article]:[padding:18px_0] max-[720px]:[&_article+article]:[border-left:0] max-[720px]:[&_article+article]:[border-top:1px_solid_color-mix(in_srgb,_var(--border)_58%,_transparent)] motion-safe:[animation:rise_520ms_cubic-bezier(0.22,_1,_0.36,_1)_both] motion-safe:[animation-delay:140ms]"
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
    class="landing-foot [padding:18px_22px_28px] [color:var(--muted-foreground)] [font-size:12px] [&_p]:m-0 [&_p]:[max-width:28rem] max-[520px]:[padding-inline:10px]"
  >
    <p>
      “chikọta” is igbo for gather. a small room for the web you mean to keep.
    </p>
  </footer>
</div>
