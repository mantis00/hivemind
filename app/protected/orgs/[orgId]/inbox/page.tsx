// this pretty much says that if we are trying to navigate to /protected/orgs/[orgId]/account, we should use the account page component to render.
// this path exists to make sure that if it is clicked when the user is in an org and can see the sidebar, it will render the account page correctly and keep the sidebar visible.
export { default } from '../../../inbox/page'
