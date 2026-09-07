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

<div class="landing">
  <header class="landing-bar">
    <a class="wordmark" href={resolve('/')} aria-label="chikota home"
      ><h1>chikota</h1></a
    >
    <div class="landing-tools">
      <div class="theme-pills" role="group" aria-label="appearance">
        {#each themes as theme (theme.id)}
          <button
            type="button"
            class={['theme-pill', { active: themeStore.current === theme.id }]}
            aria-pressed={themeStore.current === theme.id}
            onclick={() => themeStore.set(theme.id)}>{theme.label}</button
          >
        {/each}
      </div>
      <button
        type="button"
        class="plain-button"
        disabled={signingIn}
        onclick={signIn}>{signingIn ? 'redirecting…' : 'sign in'}</button
      >
    </div>
  </header>

  <main class="landing-main">
    <section class="hero">
      <p class="eyebrow">igbo · gather</p>
      <h2>your reading room.</h2>
      <p class="lede">
        a quiet place for the links you want to keep. save a find, pin it, come
        back when you have a moment — not another folder of forgotten bookmarks.
      </p>
      <div class="cta">
        <button type="button" class="primary-button enter" onclick={onenter}>
          start collecting<ArrowRight size={14} />
        </button>
        <button
          type="button"
          class="secondary-button google"
          disabled={signingIn}
          onclick={signIn}
        >
          <svg class="google-mark" viewBox="0 0 24 24" aria-hidden="true">
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

    <section class="preview" aria-hidden="true">
      <div class="preview-frame">
        <div class="preview-toolbar">
          <span class="preview-title"
            ><BookmarkFilled size={13} />bookmarks</span
          >
          <span class="preview-count">{preview.length}</span>
        </div>
        {#each preview as item, index (item.host)}
          <article class="preview-row">
            <span class="preview-mark"
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

    <section class="features" aria-label="what chikota is for">
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

  <footer class="landing-foot">
    <p>
      “chikọta” is igbo for gather. a small room for the web you mean to keep.
    </p>
  </footer>
</div>

<style>
  .landing {
    width: min(820px, calc(100% - 40px));
    margin: 0 auto;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    border-inline: 1px solid color-mix(in srgb, var(--border) 58%, transparent);
  }
  .landing-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 18px 10px;
    min-height: 72px;
  }
  .landing-tools {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .theme-pills {
    display: flex;
    padding: 2px;
    border: 1px solid var(--border);
    border-radius: 22px;
    background: var(--sidebar);
  }
  .theme-pill {
    border: 0;
    background: transparent;
    color: var(--muted-foreground);
    border-radius: 18px;
    padding: 5px 10px;
    font-size: 11px;
    min-height: 26px;
  }
  .theme-pill.active {
    background: var(--background);
    color: var(--foreground);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--border) 80%, transparent);
  }
  .landing-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 12px 22px 36px;
  }
  .hero {
    max-width: 34rem;
    padding: 28px 0 36px;
  }
  .eyebrow {
    margin: 0 0 10px;
    color: var(--muted-foreground);
    font-size: 11px;
    letter-spacing: 0.08em;
  }
  h2 {
    margin: 0;
    font-size: clamp(48px, 8vw, 76px);
    line-height: 0.95;
    color: var(--foreground);
  }
  .lede {
    margin: 18px 0 0;
    max-width: 28rem;
    color: var(--muted-foreground);
    font-size: 15px;
    line-height: 1.55;
  }
  .cta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 28px;
  }
  .enter,
  .google {
    min-height: 38px;
    padding: 8px 14px;
    font-size: 12px;
  }
  .google-mark {
    width: 14px;
    height: 14px;
  }
  .preview {
    margin: 8px 0 8px;
  }
  .preview-frame {
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--card);
  }
  .preview-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 12px 14px 10px;
    border-bottom: 1px solid var(--soft-border);
    color: var(--muted-foreground);
  }
  .preview-title {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: var(--foreground);
    font-family: var(--font-heading);
    font-size: 22px;
    line-height: 1;
  }
  .preview-count {
    font-size: 11px;
  }
  .preview-row {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    color: var(--muted-foreground);
  }
  .preview-row + .preview-row {
    border-top: 1px solid var(--soft-border);
  }
  .preview-mark {
    position: relative;
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    overflow: hidden;
    border-radius: 6px;
    background: var(--secondary);
    color: var(--foreground);
    font-size: 11px;
    font-weight: 500;
  }
  .preview-mark img {
    position: absolute;
    inset: 5px;
    width: 18px;
    height: 18px;
    object-fit: contain;
  }
  .preview-row strong {
    display: block;
    color: var(--foreground);
    font-size: 13px;
    font-weight: 500;
  }
  .preview-row small {
    display: block;
    margin-top: 2px;
    font-size: 11px;
  }
  .features {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0;
    margin-top: 28px;
    border-top: 1px solid color-mix(in srgb, var(--border) 58%, transparent);
  }
  .features article {
    padding: 22px 18px 8px 0;
  }
  .features article + article {
    padding-left: 18px;
    border-left: 1px solid color-mix(in srgb, var(--border) 58%, transparent);
  }
  .features h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 8px;
    font-size: 26px;
  }
  .features p {
    margin: 0;
    color: var(--muted-foreground);
    font-size: 13px;
    line-height: 1.5;
  }
  .landing-foot {
    padding: 18px 22px 28px;
    color: var(--muted-foreground);
    font-size: 12px;
  }
  .landing-foot p {
    margin: 0;
    max-width: 28rem;
  }
  @media (max-width: 720px) {
    .landing {
      width: calc(100% - 28px);
    }
    .landing-bar {
      flex-wrap: wrap;
      padding: 16px 10px 8px;
    }
    .landing-main {
      padding-inline: 14px;
    }
    .hero {
      padding-top: 18px;
    }
    .features {
      grid-template-columns: 1fr;
    }
    .features article,
    .features article + article {
      padding: 18px 0;
      border-left: 0;
      border-top: 1px solid color-mix(in srgb, var(--border) 58%, transparent);
    }
  }
  @media (max-width: 520px) {
    .landing {
      width: calc(100% - 20px);
    }
    .landing-main {
      padding-inline: 10px;
    }
    .cta {
      flex-direction: column;
      align-items: stretch;
    }
    .enter,
    .google {
      width: 100%;
    }
    .landing-foot {
      padding-inline: 10px;
    }
  }
  @media (prefers-reduced-motion: no-preference) {
    .hero,
    .preview,
    .features {
      animation: rise 520ms cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    .preview {
      animation-delay: 80ms;
    }
    .features {
      animation-delay: 140ms;
    }
  }
  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
