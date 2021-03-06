import React from 'react';

export default class Loading extends React.Component {
    constructor(props) {
        super(props);
    }
    render() {
        return (<div className='valign-wrapper' style={{position: 'absolute',top:'0',left:'0',width: '100%',height:'100%'}}>
            <div className='valign center-align' style={{width:'100%'}}>
            <h4>{this.props.text ? this.props.text : 'Loading'}</h4>
                <div className='preloader-wrapper large active'>
                    <div className='spinner-layer spinner-green-only'>
                        <div className='circle-clipper left'>
                            <div className='circle'></div>
                        </div>
                        <div className='gap-patch'>
                            <div className='circle'></div>
                        </div>
                        <div className='circle-clipper right'>
                            <div className='circle'></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>);
    }
}
