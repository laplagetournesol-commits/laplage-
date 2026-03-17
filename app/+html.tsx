import { type PropsWithChildren } from 'react';

/**
 * Custom HTML template for Expo Router web.
 * Overrides the default to add `display:flex;flex-direction:column` on body,
 * which is required for Firefox to correctly expand #root with `flex:1`.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />

        {/* react-native-web recommended reset + Firefox flex fix on body */}
        <style
          id="expo-reset"
          dangerouslySetInnerHTML={{
            __html: `html,body{height:100%}body{overflow:hidden;display:flex;flex-direction:column}#root{display:flex;flex:1}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
