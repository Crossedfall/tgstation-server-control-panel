import * as React from 'react';
import { NavLink } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { BarLoader, SyncLoader } from 'react-spinners';

import Glyphicon from '@strongdm/glyphicon';

import { User, ServerInformation } from '../clients/generated';

import IServerClient from '../clients/IServerClient';

import Home from './Home';

interface IProps {
    serverClient: IServerClient;
}

interface IState {
    currentUser?: User;
    userNameError?: string;
    serverInfoError?: string;
    retryIn?: Date;
    serverInformation?: ServerInformation;
}

export default class Navbar extends React.Component<IProps, IState> {
    private retryTimer: NodeJS.Timeout | null;

    public constructor(props: IProps) {
        super(props);
        this.state = {};
        this.retryTimer = null;

        this.tryLoadInformation = this.tryLoadInformation.bind(this);
        this.logoutClick = this.logoutClick.bind(this);
    }

    public async componentDidMount(): Promise<void> {
        await this.tryLoadInformation();
    }

    public componentWillUnmount() {
        if (this.retryTimer != null) {
            clearTimeout(this.retryTimer);
            this.retryTimer = null;
        }
    }

    public render(): React.ReactNode {
        return (
            <div
                className={
                    'navbar navbar-dark ' +
                    (this.state.serverInfoError || this.state.userNameError
                        ? 'bg-danger'
                        : 'bg-primary')
                }>
                <div className="navbar-expand navbar-brand">
                    {this.renderVersion()}
                </div>
                <div className="navbar-nav mr-auto">
                    <NavLink
                        className="nav-item nav-link"
                        to={Home.Route}
                        activeClassName="active">
                        <FormattedMessage id="navbar.home" />
                    </NavLink>
                </div>
                <div className="navbar-item">{this.renderUser()}</div>
            </div>
        );
    }

    private renderVersion(): React.ReactNode {
        if (this.state.serverInfoError)
            return (
                <div>
                    <div className="align-top d-inline-block px-1">
                        <Glyphicon glyph="exclamation-sign" />
                    </div>
                    <div className="d-inline-block">
                        <FormattedMessage id="navbar.server_error" />:{' '}
                        {this.state.serverInfoError}
                    </div>
                </div>
            );
        if (this.state.serverInformation)
            return (
                <span>
                    tgstation-server v{this.state.serverInformation.version}
                </span>
            );

        return <BarLoader color={'white'} />;
    }

    private renderUser(): React.ReactNode {
        if (this.state.userNameError)
            return (
                <div>
                    <div className="align-top d-inline-block px-1">
                        <Glyphicon glyph="exclamation-sign" />
                    </div>
                    <div className="d-inline-block">
                        <FormattedMessage id="navbar.user_error" />:{' '}
                        {this.state.userNameError}
                    </div>
                </div>
            );
        if (this.state.currentUser)
            return (
                <div className="dropdown">
                    <button
                        type="button"
                        className={
                            'btn dropdown-toggle ' +
                            (this.state.serverInfoError ||
                            this.state.userNameError
                                ? 'btn-danger'
                                : 'btn-primary')
                        }
                        data-toggle="dropdown"
                        aria-haspopup="true"
                        aria-expanded="false">
                        {this.state.currentUser.name}
                    </button>
                    <div className="dropdown-menu dropdown-menu-right">
                        <button
                            type="button"
                            className="dropdown-item text-right"
                            onClick={this.logoutClick}>
                            <FormattedMessage id="navbar.logout" />
                        </button>
                    </div>
                </div>
            );

        return (
            <div className="Navbar-user-loading">
                <SyncLoader color={'white'} />
            </div>
        );
    }

    private logoutClick(): void {
        this.props.serverClient.logout();
    }

    private async loadServerInformation(): Promise<void> {
        const info = await this.props.serverClient.getServerInformationCached();
        if (!info) {
            return;
        }

        if (!info.model) {
            const loadingError = await info.getError();

            // retry every 10s
            const retryIn = new Date(Date.now() + 10000);

            this.setState(prevState => {
                return {
                    serverInfoError: loadingError,
                    userNameError: prevState.userNameError,
                    retryIn
                };
            });

            return;
        }

        this.setState(prevState => {
            return {
                currentUser: prevState.currentUser,
                userNameError: prevState.userNameError,
                serverInformation: info.model
            };
        });
    }

    private async loadUserInformation(): Promise<void> {
        const user = await this.props.serverClient.users.getCurrentCached();
        if (!user) {
            return;
        }

        if (!user.model) {
            const loadingError = await user.getError();

            // retry every 10s
            const retryIn = new Date(Date.now() + 10000);

            this.setState(prevState => {
                return {
                    serverInformation: prevState.serverInformation,
                    serverInfoError: prevState.serverInfoError,
                    userNameError: loadingError,
                    retryIn
                };
            });

            return;
        }

        this.setState(prevState => {
            return {
                currentUser: user.model,
                serverInformation: prevState.serverInformation,
                serverInfoError: prevState.serverInfoError
            };
        });
    }

    private async tryLoadInformation(): Promise<void> {
        if (this.state.retryIn != null && this.state.retryIn < new Date()) {
            this.retryTimer = setTimeout(
                this.tryLoadInformation,
                this.state.retryIn.getMilliseconds() - Date.now()
            );
            return;
        }

        const serverInfoPromise = this.loadServerInformation();
        await this.loadUserInformation();
        await serverInfoPromise;
    }
}
