import React from 'react'

/**
 * DaVinciOSAdminLogo — HomeU brand logo for the DaVinciOS admin panel.
 *
 * Replaces the default DaVinciOS graphic logo in the admin login page and
 * navigation sidebar. Registered in daVinciOS.config.ts under
 * admin.components.graphics.Logo.
 */
const DaVinciOSAdminLogo: React.FC<{
  i18n?: Record<string, any>
  config?: Record<string, any>
  [key: string]: any
}> = () => {
  return (
    <svg
      className="graphic-logo"
      width="160"
      height="36"
      viewBox="0 0 160 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* HomeU wordmark — custom premium lettering */}
      <g transform="translate(0, 6)">
        {/* H */}
        <path
          d="M4 24V2h3.6v8.2h8.8V2H20v22h-3.6v-9.6H7.6V24H4z"
          fill="currentColor"
        />
        {/* o */}
        <ellipse
          cx="28.4"
          cy="13"
          rx="5.8"
          ry="5.6"
          fill="currentColor"
        />
        <ellipse
          cx="28.4"
          cy="13"
          rx="3"
          ry="2.8"
          fill="var(--theme-elevation-0, #fff)"
        />
        {/* m */}
        <path
          d="M40.6 24V7.6h3.2v2.4c1-1.6 2.4-2.8 4.8-2.8 3 0 4.6 1.8 4.6 5.2V24h-3.4v-9.6c0-2.4-1-3.6-3-3.6s-3.6 1.2-3.6 3.6V24H40.6z"
          fill="currentColor"
        />
        {/* e */}
        <path
          d="M65 19.6c-.6 1.6-2.2 2.8-4.4 2.8-3 0-5.2-2-5.2-5.4s2.2-5.4 5.2-5.4c2.8 0 4.6 1.8 4.6 5v.8h-10.2c0-1.6.8-3 2.6-3 1.4 0 2.2.8 2.4 2l3.2-.6c-.2-1.6-1.6-3.4-5-3.4-3.4 0-5.8 2.4-5.8 6.2s2.4 6.2 5.8 6.2c2.6 0 4.4-1.2 5.4-3l-3-1.2zM58 17h6.4c-.2-1.2-1-2-2.4-2s-3 .6-4 2z"
          fill="currentColor"
        />
        {/* U */}
        <path
          d="M80.4 24V11.6c0-2.4 1.4-4 3.8-4s3.8 1.6 3.8 4V24h3.4V11.6c0-4 2.6-6.4 6.4-6.4s6.4 2.4 6.4 6.4V24h-3.4V11.6c0-2.4-1.4-4-3.8-4s-3.8 1.6-3.8 4V24H80.4z"
          fill="currentColor"
        />
      </g>
      {/* Tagline */}
      <text
        x="4"
        y="33"
        fontFamily="Inter, -apple-system, BlinkMacSystemFont, sans-serif"
        fontSize="9"
        fontWeight="600"
        letterSpacing="3.5"
        fill="currentColor"
        opacity="0.5"
      >
        COMMAND CENTER
      </text>
    </svg>
  )
}

export { DaVinciOSAdminLogo }
export default DaVinciOSAdminLogo
